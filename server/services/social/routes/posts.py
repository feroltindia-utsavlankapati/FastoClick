"""
REST endpoints for post scheduling — CRUD, publish-now, retry.
"""
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy import desc
from shared.database import async_session_maker
from shared.models.tenant import ScheduledPost, ConnectedSocialAccount, User
from shared.dependencies import get_current_tenant, TenantContext
from shared.social.provider_registry import PLATFORM_DISPLAY_NAMES

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/posts/{tenant_id}")
async def list_posts(
    tenant_id: str,
    project_id: str = None,
    status: str = None,
    platform: str = None,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """List posts with optional status/platform filters."""
    try:
        async with async_session_maker() as session:
            query = select(ScheduledPost).where(
                ScheduledPost.tenant_id == tenant_id
            )
            if project_id:
                query = query.where(ScheduledPost.project_id == project_id)
            query = query.order_by(desc(ScheduledPost.created_at))

            if status:
                query = query.where(ScheduledPost.status == status)

            result = await session.execute(query)
            posts = result.scalars().all()

            # Resolve account names for display
            data = []
            for p in posts:
                account_ids = json.loads(p.platform_account_ids or "[]")
                platforms = []

                if account_ids:
                    acc_result = await session.execute(
                        select(ConnectedSocialAccount).where(
                            ConnectedSocialAccount.id.in_(account_ids)
                        )
                    )
                    accounts = acc_result.scalars().all()
                    
                    # Fallback for orphaned account IDs
                    if not accounts:
                        platform_post_ids_val = json.loads(p.platform_post_ids or "{}")
                        for plat_key in platform_post_ids_val:
                            effective_plat = "facebook" if plat_key == "meta" else plat_key
                            fallback_res = await session.execute(
                                select(ConnectedSocialAccount).where(
                                    ConnectedSocialAccount.tenant_id == tenant_id,
                                    ConnectedSocialAccount.platform == effective_plat
                                )
                            )
                            fb_acc = fallback_res.scalars().first()
                            if fb_acc:
                                accounts = [fb_acc]
                                break
                            else:
                                dummy_disp = "Facebook" if effective_plat == "facebook" else effective_plat.capitalize()
                                platforms.append({
                                    "platform": effective_plat,
                                    "platform_name": dummy_disp,
                                    "account_name": "Disconnected Account",
                                })

                    if accounts:
                        for a in accounts:
                            effective_plat = "facebook" if a.platform == "meta" else a.platform
                            platforms.append({
                                "platform": effective_plat,
                                "platform_name": "Facebook" if a.platform == "meta" else PLATFORM_DISPLAY_NAMES.get(a.platform, a.platform),
                                "account_name": a.account_name or a.account_handle or "",
                            })

                    if platform:
                        if not any(a.get("platform") == platform for a in platforms):
                            continue

                data.append({
                    "id": p.id,
                    "caption": p.caption or "",
                    "hashtags": p.hashtags or "",
                    "mentions": p.mentions or "",
                    "link_url": p.link_url or "",
                    "media_ids": json.loads(p.media_ids or "[]"),
                    "platforms": platforms,
                    "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
                    "timezone": p.timezone or "UTC",
                    "status": p.status or "draft",
                    "retry_count": p.retry_count or 0,
                    "publish_log": json.loads(p.publish_log or "[]"),
                    "platform_post_ids": json.loads(p.platform_post_ids or "{}"),
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                })

            return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Failed to list posts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/detail/{post_id}")
async def get_post_detail(post_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Get detailed info for a single post."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(ScheduledPost.id == post_id)
            )
            p = result.scalars().first()
            if not p:
                raise HTTPException(status_code=404, detail="Post not found")

            return {
                "success": True,
                "data": {
                    "id": p.id,
                    "caption": p.caption or "",
                    "hashtags": p.hashtags or "",
                    "mentions": p.mentions or "",
                    "link_url": p.link_url or "",
                    "media_ids": json.loads(p.media_ids or "[]"),
                    "platform_account_ids": json.loads(p.platform_account_ids or "[]"),
                    "scheduled_at": p.scheduled_at.isoformat() if p.scheduled_at else None,
                    "timezone": p.timezone or "UTC",
                    "status": p.status or "draft",
                    "recurrence_rule": p.recurrence_rule,
                    "publish_log": json.loads(p.publish_log or "[]"),
                    "platform_post_ids": json.loads(p.platform_post_ids or "{}"),
                    "retry_count": p.retry_count or 0,
                    "max_retries": p.max_retries or 3,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get post detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posts")
async def create_post(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Create a new post (draft or scheduled)."""
    tenant_id = payload.get("tenant_id", "")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id is required")

    scheduled_at = payload.get("scheduled_at")
    status = "scheduled" if scheduled_at else "draft"
    platform_post_ids_val = payload.get("platform_post_ids", {})

    try:
        parsed_time = None
        if scheduled_at:
            parsed_time = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))

        async with async_session_maker() as session:
            # Fallback to user's default timezone from database if not explicitly set
            user_tz = payload.get("timezone")
            if not user_tz or user_tz == "UTC":
                user_res = await session.execute(select(User).where(User.id == tenant.user_id))
                user = user_res.scalars().first()
                if user and user.timezone:
                    user_tz = user.timezone
            if not user_tz:
                user_tz = "UTC"

            # Check if we should automatically mark the post as published
            platform_account_ids = payload.get("platform_account_ids", [])
            if platform_account_ids and platform_post_ids_val:
                acc_res = await session.execute(
                    select(ConnectedSocialAccount.platform).where(
                        ConnectedSocialAccount.id.in_(platform_account_ids)
                    )
                )
                selected_platforms = set(acc_res.scalars().all())
                if selected_platforms and all(platform_post_ids_val.get(plat) for plat in selected_platforms):
                    status = "published"

            post = ScheduledPost(
                tenant_id=tenant_id,
                project_id=payload.get("project_id"),
                product_id=payload.get("product_id"),
                caption=payload.get("caption", ""),
                hashtags=payload.get("hashtags", ""),
                mentions=payload.get("mentions", ""),
                link_url=payload.get("link_url", ""),
                media_ids=json.dumps(payload.get("media_ids", [])),
                platform_account_ids=json.dumps(platform_account_ids),
                scheduled_at=parsed_time,
                timezone=user_tz,
                status=status,
                recurrence_rule=payload.get("recurrence_rule"),
                max_retries=payload.get("max_retries", 3),
                platform_post_ids=json.dumps(platform_post_ids_val),
            )
            session.add(post)
            await session.commit()
            await session.refresh(post)

            return {
                "success": True,
                "message": f"Post {'scheduled' if status == 'scheduled' else 'saved as draft' if status == 'draft' else 'linked as published'}",
                "data": {"id": post.id, "status": post.status}
            }
    except Exception as e:
        logger.error(f"Failed to create post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/posts/{post_id}")
async def update_post(post_id: str, payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Edit a scheduled or draft post."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(ScheduledPost.id == post_id)
            )
            post = result.scalars().first()
            if not post:
                raise HTTPException(status_code=404, detail="Post not found")

            if post.status not in ("draft", "scheduled", "failed", "retry_pending"):
                raise HTTPException(status_code=400, detail="Cannot edit a published or publishing post")

            if "caption" in payload:
                post.caption = payload["caption"]
            if "hashtags" in payload:
                post.hashtags = payload["hashtags"]
            if "mentions" in payload:
                post.mentions = payload["mentions"]
            if "link_url" in payload:
                post.link_url = payload["link_url"]
            if "media_ids" in payload:
                post.media_ids = json.dumps(payload["media_ids"])
            if "platform_account_ids" in payload:
                post.platform_account_ids = json.dumps(payload["platform_account_ids"])
            if "scheduled_at" in payload:
                if payload["scheduled_at"]:
                    post.scheduled_at = datetime.fromisoformat(
                        payload["scheduled_at"].replace("Z", "+00:00")
                    )
                    post.status = "scheduled"
                else:
                    post.scheduled_at = None
                    post.status = "draft"
            if "timezone" in payload:
                post.timezone = payload["timezone"]
            if "recurrence_rule" in payload:
                post.recurrence_rule = payload["recurrence_rule"]

            if "platform_post_ids" in payload:
                post.platform_post_ids = json.dumps(payload["platform_post_ids"])
                # Dynamically promote status to published if all selected platforms are provided
                platform_post_ids_val = payload["platform_post_ids"]
                platform_account_ids = json.loads(post.platform_account_ids or "[]")
                if platform_account_ids and platform_post_ids_val:
                    acc_res = await session.execute(
                        select(ConnectedSocialAccount.platform).where(
                            ConnectedSocialAccount.id.in_(platform_account_ids)
                        )
                    )
                    selected_platforms = set(acc_res.scalars().all())
                    if selected_platforms and all(platform_post_ids_val.get(plat) for plat in selected_platforms):
                        post.status = "published"

            await session.commit()

            return {"success": True, "message": "Post updated", "data": {"id": post.id, "status": post.status}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Cancel/delete a post."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(ScheduledPost.id == post_id)
            )
            post = result.scalars().first()
            if not post:
                raise HTTPException(status_code=404, detail="Post not found")

            await session.delete(post)
            await session.commit()

        return {"success": True, "message": "Post deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete post: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posts/{post_id}/publish-now")
async def publish_now(post_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Immediately and synchronously publish a draft/scheduled post to all platforms."""
    from services.social.scheduler import _publish_single_post
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(ScheduledPost.id == post_id)
            )
            post = result.scalars().first()
            if not post:
                raise HTTPException(status_code=404, detail="Post not found")

            if post.status in ("published", "publishing"):
                raise HTTPException(status_code=400, detail="Post is already published or publishing")

            # Publish synchronously
            await _publish_single_post(session, post)
            await session.commit()
            
            # Refresh from db to get latest status and logs
            await session.refresh(post)

        logs = json.loads(post.publish_log or "[]")
        errors = [l.get("error") for l in logs if not l.get("success") and l.get("error")]

        if post.status == "published":
            return {"success": True, "message": "Post published successfully!"}
        else:
            err_msg = errors[0] if errors else "Failed to publish post to one or more platforms"
            return {"success": False, "message": err_msg}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to publish now: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/posts/{post_id}/retry")
async def retry_post(post_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Retry a failed post."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ScheduledPost).where(ScheduledPost.id == post_id)
            )
            post = result.scalars().first()
            if not post:
                raise HTTPException(status_code=404, detail="Post not found")

            if post.status not in ("failed", "retry_pending"):
                raise HTTPException(status_code=400, detail="Post is not in a failed state")

            post.status = "scheduled"
            post.scheduled_at = datetime.now(timezone.utc)
            post.retry_count = 0
            await session.commit()

        return {"success": True, "message": "Post scheduled for retry"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retry post: {e}")
        raise HTTPException(status_code=500, detail=str(e))
