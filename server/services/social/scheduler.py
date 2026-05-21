"""
APScheduler-based publishing engine for scheduled social media posts.
Runs as a background async scheduler within the Social Service.
"""
import json
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.future import select
from shared.database import async_session_maker
from shared.models.tenant import ScheduledPost, ConnectedSocialAccount, PostAnalytics, MediaAsset
from shared.utils.security import decrypt_token
from shared.social.provider_registry import get_provider

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def process_due_posts():
    """Find and publish all posts that are due."""
    now = datetime.now(timezone.utc)
    logger.info(f"[Scheduler] Checking for due posts at {now.isoformat()}")

    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(
                    ScheduledPost.status == "scheduled",
                    ScheduledPost.scheduled_at <= now
                )
            )
            due_posts = result.scalars().all()

            if not due_posts:
                return

            logger.info(f"[Scheduler] Found {len(due_posts)} due posts")

            for post in due_posts:
                await _publish_single_post(session, post)

            await session.commit()

    except Exception as e:
        logger.error(f"[Scheduler] Error processing due posts: {e}")


async def _publish_single_post(session, post: ScheduledPost):
    """Attempt to publish a single post to all selected platform accounts."""
    logger.info(f"[Scheduler] Publishing post {post.id}")

    # Mark as publishing
    post.status = "publishing"
    await session.flush()

    account_ids = json.loads(post.platform_account_ids or "[]")
    if not account_ids:
        post.status = "failed"
        post.publish_log = json.dumps([{
            "error": "No platform accounts selected",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }])
        return

    logs = json.loads(post.publish_log or "[]")
    platform_post_ids = json.loads(post.platform_post_ids or "{}")
    all_success = True

    for account_id in account_ids:
        result = await session.execute(
            select(ConnectedSocialAccount).where(ConnectedSocialAccount.id == account_id)
        )
        account = result.scalars().first()

        if not account:
            logs.append({
                "account_id": account_id,
                "error": "Account not found",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            all_success = False
            continue

        provider = get_provider(account.platform)
        if not provider:
            logs.append({
                "account_id": account_id,
                "platform": account.platform,
                "error": f"No provider for platform: {account.platform}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            all_success = False
            continue

        try:
            existing_pid = platform_post_ids.get(account.platform, "")
            if existing_pid:
                logs.append({
                    "account_id": account_id,
                    "platform": account.platform,
                    "platform_post_id": existing_pid,
                    "url": (
                        f"https://instagram.com/p/{existing_pid}" if account.platform == "instagram"
                        else f"https://facebook.com/{existing_pid}" if account.platform in ("facebook", "meta")
                        else ""
                    ),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": "Skipped publishing: post ID already provided manually"
                })
                logger.info(f"[Scheduler] Skipped publishing to {account.platform} for post {post.id} (manual post ID exists)")
                continue

            access_token = decrypt_token(account.access_token_enc) if account.access_token_enc else ""
            account_data = {
                "access_token": access_token,
                "platform_user_id": account.platform_user_id,
                "account_name": account.account_name,
            }

            media_files = []
            try:
                media_ids = json.loads(post.media_ids or "[]")
                if media_ids:
                    media_result = await session.execute(
                        select(MediaAsset).where(MediaAsset.id.in_(media_ids))
                    )
                    assets = media_result.scalars().all()
                    asset_map = {asset.id: asset for asset in assets}
                    for mid in media_ids:
                        if mid in asset_map:
                            asset = asset_map[mid]
                            media_files.append({
                                "id": asset.id,
                                "file_path": asset.file_path,
                                "mime_type": asset.mime_type,
                                "filename": asset.filename
                            })
            except Exception as me:
                logger.error(f"[Scheduler] Failed to resolve media assets for post {post.id}: {me}")

            post_data = {
                "caption": post.caption or "",
                "hashtags": post.hashtags or "",
                "mentions": post.mentions or "",
                "link": post.link_url or "",
                "media_files": media_files,
            }

            publish_result = await provider.publish_post(account_data, post_data)

            platform_post_id = publish_result.get("platform_post_id", "")
            if platform_post_id:
                platform_post_ids[account.platform] = platform_post_id

            logs.append({
                "account_id": account_id,
                "platform": account.platform,
                "success": True,
                "platform_post_id": platform_post_id,
                "url": publish_result.get("url", ""),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"[Scheduler] Published to {account.platform} for post {post.id}")

        except Exception as e:
            all_success = False
            logs.append({
                "account_id": account_id,
                "platform": account.platform,
                "success": False,
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            logger.error(f"[Scheduler] Failed to publish to {account.platform}: {e}")

    post.publish_log = json.dumps(logs)
    post.platform_post_ids = json.dumps(platform_post_ids)

    if all_success:
        post.status = "published"
    else:
        post.retry_count = (post.retry_count or 0) + 1
        if post.retry_count >= (post.max_retries or 3):
            post.status = "failed"
        else:
            post.status = "retry_pending"

    logger.info(f"[Scheduler] Post {post.id} final status: {post.status}")


async def _sync_posts_analytics(posts):
    """Core logic: sync analytics for a list of ScheduledPost objects."""
    from sqlalchemy import delete as sa_delete

    async with async_session_maker() as session:
        for post in posts:
            platform_post_ids = json.loads(post.platform_post_ids or "{}")
            account_ids = json.loads(post.platform_account_ids or "[]")

            if not platform_post_ids:
                continue  # No platform IDs — nothing to sync

            for account_id in account_ids:
                acc_result = await session.execute(
                    select(ConnectedSocialAccount).where(ConnectedSocialAccount.id == account_id)
                )
                account = acc_result.scalars().first()

                if not account:
                    # Orphaned account ID — try to find a matching account via platform name + tenant
                    logger.warning(f"[Scheduler] Account {account_id} not found for post {post.id}. Attempting fallback lookup...")
                    # Determine which platforms have IDs in this post
                    for plat_key in platform_post_ids:
                        effective_plat = "facebook" if plat_key == "meta" else plat_key
                        fb_result = await session.execute(
                            select(ConnectedSocialAccount).where(
                                ConnectedSocialAccount.platform == effective_plat,
                                ConnectedSocialAccount.tenant_id == post.tenant_id,
                            )
                        )
                        fallback = fb_result.scalars().first()
                        if fallback:
                            logger.info(f"[Scheduler] Using fallback account {fallback.id} ({fallback.account_name}) for post {post.id} / {plat_key}")
                            account = fallback
                            account_id = fallback.id
                            break
                    if not account:
                        logger.warning(f"[Scheduler] No fallback account found for post {post.id}. Skipping.")
                        continue

                provider = get_provider(account.platform)
                if not provider:
                    continue

                platform_pid = platform_post_ids.get(account.platform, "")
                if not platform_pid and account.platform == "facebook":
                    platform_pid = platform_post_ids.get("meta", "")
                    
                if not platform_pid:
                    continue

                try:
                    access_token = decrypt_token(account.access_token_enc) if account.access_token_enc else ""
                    analytics = await provider.fetch_post_analytics(
                        {"access_token": access_token, "platform_user_id": account.platform_user_id},
                        platform_pid
                    )

                    if not analytics:
                        logger.warning(f"[Scheduler] Empty analytics returned for post {post.id}, platform {account.platform}")
                        continue

                    # Compute engagement_rate if provider didn't supply it
                    er = analytics.get("engagement_rate", 0.0)
                    if not er:
                        imp = analytics.get("impressions", 0)
                        rch = analytics.get("reach", 0)
                        total = (
                            analytics.get("likes", 0)
                            + analytics.get("comments", 0)
                            + analytics.get("shares", 0)
                            + analytics.get("clicks", 0)
                        )
                        base = imp or rch
                        er = round((total / base) * 100, 2) if base else 0.0

                    now_utc = datetime.utcnow()  # naive UTC — matches SQLite storage
                    effective_plat = "facebook" if account.platform == "meta" else account.platform

                    # Delete ALL existing rows for this (post, platform, account) combination
                    # to avoid stale duplicates from previous syncs.
                    await session.execute(
                        sa_delete(PostAnalytics).where(
                            PostAnalytics.post_id == post.id,
                            PostAnalytics.platform == effective_plat,
                            PostAnalytics.account_id == account_id,
                        )
                    )

                    # Insert a fresh, clean row
                    pa = PostAnalytics(
                        post_id=post.id,
                        platform=effective_plat,
                        account_id=account_id,
                        impressions=analytics.get("impressions", 0),
                        reach=analytics.get("reach", 0),
                        likes=analytics.get("likes", 0),
                        comments=analytics.get("comments", 0),
                        shares=analytics.get("shares", 0),
                        clicks=analytics.get("clicks", 0),
                        engagement_rate=er,
                        video_views=analytics.get("video_views", 0),
                        watch_time_seconds=analytics.get("watch_time_seconds", 0.0),
                        raw_data_json=json.dumps(analytics),
                        synced_at=now_utc,
                    )
                    session.add(pa)
                    logger.info(f"[Scheduler] Synced analytics for post {post.id} / {account.platform}: impressions={pa.impressions}, reach={pa.reach}")

                except Exception as e:
                    logger.error(f"[Scheduler] Analytics sync failed for post {post.id}, platform {account.platform}: {e}")

        await session.commit()


async def sync_analytics():
    """Sync analytics for ALL recently published posts (background job)."""
    logger.info("[Scheduler] Syncing analytics for all published posts")
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(ScheduledPost.status == "published").limit(50)
            )
            posts = result.scalars().all()
        await _sync_posts_analytics(posts)
    except Exception as e:
        logger.error(f"[Scheduler] Analytics sync error: {e}")


async def sync_analytics_for_tenant(tenant_id: str):
    """
    Sync analytics for a specific tenant's posts that have platform post IDs.
    Includes all statuses (published, scheduled) as long as a platform_post_id exists,
    so manually-linked posts are also covered.
    """
    logger.info(f"[Scheduler] Syncing analytics for tenant {tenant_id}")
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(
                    ScheduledPost.tenant_id == tenant_id,
                    ScheduledPost.platform_post_ids.isnot(None),
                    ScheduledPost.platform_post_ids != "{}",
                    ScheduledPost.platform_post_ids != "",
                )
            )
            posts = result.scalars().all()
            # Further filter: only posts that actually have at least one platform_post_id
            posts = [p for p in posts if json.loads(p.platform_post_ids or "{}")]
        logger.info(f"[Scheduler] Found {len(posts)} posts to sync for tenant {tenant_id}")
        await _sync_posts_analytics(posts)
    except Exception as e:
        logger.error(f"[Scheduler] Tenant analytics sync error for {tenant_id}: {e}")


def start_scheduler():
    """Start the APScheduler with publishing and analytics jobs."""
    scheduler.add_job(
        process_due_posts,
        IntervalTrigger(seconds=30),
        id="publish_due_posts",
        name="Publish due social media posts",
        replace_existing=True
    )

    scheduler.add_job(
        sync_analytics,
        IntervalTrigger(hours=6),
        id="sync_analytics",
        name="Sync analytics for published posts",
        replace_existing=True
    )

    scheduler.start()
    logger.info("[Scheduler] Social media scheduler started (publish every 30s, analytics every 6h)")
    print("  📡 Social media scheduler started (publish every 30s, analytics every 6h)")


def stop_scheduler():
    """Gracefully stop the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("[Scheduler] Social media scheduler stopped")
