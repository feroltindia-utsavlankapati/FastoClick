"""
Meta (Facebook + Instagram) provider using Graph API v21.0.
Supports OAuth, page publishing, media upload, and analytics.
"""
import os
import json
import logging
import httpx
from datetime import datetime, timedelta
from .base_provider import SocialProvider

logger = logging.getLogger(__name__)

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"


class MetaProvider(SocialProvider):
    platform = "meta"

    async def get_auth_url(self, credential: dict, redirect_uri: str) -> str:
        app_id = credential.get("app_id") or credential.get("client_id", "")
        if not app_id:
            return self._mock_response("get_auth_url", url="https://facebook.com/mock-oauth")["url"]

        config_id = credential.get("additional_config", {}).get("config_id", "")
        if config_id:
            return (
                f"https://www.facebook.com/v21.0/dialog/oauth?"
                f"client_id={app_id}&redirect_uri={redirect_uri}"
                f"&config_id={config_id}&response_type=code"
            )

        custom_scopes = credential.get("additional_config", {}).get("scopes", "")
        scopes = custom_scopes if custom_scopes else "pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish,instagram_manage_insights"
        return (
            f"https://www.facebook.com/v21.0/dialog/oauth?"
            f"client_id={app_id}&redirect_uri={redirect_uri}"
            f"&scope={scopes}&response_type=code"
        )

    async def exchange_code(self, code: str, credential: dict, redirect_uri: str) -> dict:
        app_id = credential.get("app_id") or credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")

        if not app_id or not client_secret:
            return self._mock_response("exchange_code",
                access_token="mock_meta_token_abc123",
                refresh_token="",
                expires_in=5184000,
                user_info={"id": "mock_user_123", "name": "Mock Meta User"},
                pages=[
                    {
                        "id": "mock_page_123",
                        "name": "Mock Meta Page",
                        "access_token": "mock_meta_token_abc123",
                        "picture": ""
                    }
                ]
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Exchange code for short-lived token
                resp = await client.get(f"{GRAPH_API_BASE}/oauth/access_token", params={
                    "client_id": app_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                })
                resp.raise_for_status()
                token_data = resp.json()

                access_token = token_data.get("access_token", "")

                # Exchange for long-lived token
                long_resp = await client.get(f"{GRAPH_API_BASE}/oauth/access_token", params={
                    "grant_type": "fb_exchange_token",
                    "client_id": app_id,
                    "client_secret": client_secret,
                    "fb_exchange_token": access_token,
                })
                long_data = long_resp.json()
                long_token = long_data.get("access_token", access_token)

                # Get user info
                me_resp = await client.get(f"{GRAPH_API_BASE}/me", params={
                    "access_token": long_token,
                    "fields": "id,name,picture"
                })
                user_info = me_resp.json()

                # Get pages this user manages
                pages_list = []
                try:
                    pages_resp = await client.get(f"{GRAPH_API_BASE}/me/accounts", params={
                        "access_token": long_token,
                        "fields": "id,name,picture,access_token"
                    })
                    pages_data = pages_resp.json()
                    for p in pages_data.get("data", []):
                        pages_list.append({
                            "id": p.get("id"),
                            "name": p.get("name"),
                            "access_token": p.get("access_token"),
                            "picture": p.get("picture", {}).get("data", {}).get("url", ""),
                        })
                except Exception as pe:
                    logger.error(f"Failed to fetch Meta pages: {pe}")

                return {
                    "access_token": long_token,
                    "refresh_token": "",
                    "expires_in": long_data.get("expires_in", 5184000),
                    "user_info": {
                        "id": user_info.get("id", ""),
                        "name": user_info.get("name", ""),
                        "picture": user_info.get("picture", {}).get("data", {}).get("url", ""),
                    },
                    "pages": pages_list
                }
        except Exception as e:
            logger.error(f"Meta exchange_code failed: {e}")
            raise

    async def refresh_access_token(self, account: dict) -> dict:
        # Meta long-lived tokens last 60 days and cannot be refreshed via refresh_token;
        # they need re-exchange. Return the existing token if not expired.
        return {
            "access_token": account.get("access_token", ""),
            "expires_in": 5184000,
        }

    async def publish_post(self, account: dict, post_data: dict) -> dict:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return self._mock_response("publish_post",
                platform_post_id="mock_post_" + datetime.utcnow().strftime("%Y%m%d%H%M%S"),
                url="https://facebook.com/mock-post"
            )

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                page_id = account.get("platform_user_id", "me")
                
                caption = post_data.get("caption", "").strip()
                link = post_data.get("link", "").strip()
                hashtags = post_data.get("hashtags", "").strip()
                mentions = post_data.get("mentions", "").strip()
                
                # Format hashtags
                formatted_hashtags = []
                if hashtags:
                    # Clean and prepend with #
                    for tag in [t.strip() for t in hashtags.replace(",", " ").split() if t.strip()]:
                        if not tag.startswith("#"):
                            formatted_hashtags.append(f"#{tag}")
                        else:
                            formatted_hashtags.append(tag)
                            
                # Format mentions
                formatted_mentions = []
                if mentions:
                    for mention in [m.strip() for m in mentions.replace(",", " ").split() if m.strip()]:
                        if not mention.startswith("@"):
                            formatted_mentions.append(f"@{mention}")
                        else:
                            formatted_mentions.append(mention)

                # Build full text payload
                message_parts = []
                if caption:
                    message_parts.append(caption)

                media_files = post_data.get("media_files", [])
                
                if media_files:
                    # Facebook /feed API with attached_media does not accept separate "link" param
                    if link:
                        message_parts.append(link)
                    if formatted_hashtags:
                        message_parts.append(" ".join(formatted_hashtags))
                    if formatted_mentions:
                        message_parts.append(" ".join(formatted_mentions))
                        
                    message = "\n\n".join(message_parts)
                    
                    photo_ids = []
                    for media in media_files:
                        file_path = media.get("file_path")
                        if file_path and os.path.exists(file_path):
                            with open(file_path, "rb") as f:
                                files = {"source": (media.get("filename", "image.jpg"), f, media.get("mime_type", "image/jpeg"))}
                                data = {
                                    "access_token": access_token,
                                    "published": "false"
                                }
                                resp = await client.post(f"{GRAPH_API_BASE}/{page_id}/photos", data=data, files=files)
                                resp.raise_for_status()
                                photo_id = resp.json().get("id")
                                if photo_id:
                                    photo_ids.append(photo_id)
                                    
                    if not photo_ids:
                        raise Exception("No valid image files could be uploaded to Meta")

                    attached_media = [{"media_fbid": pid} for pid in photo_ids]
                    payload = {
                        "message": message,
                        "attached_media": json.dumps(attached_media),
                        "access_token": access_token
                    }
                    resp = await client.post(f"{GRAPH_API_BASE}/{page_id}/feed", data=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    
                else:
                    if formatted_hashtags:
                        message_parts.append(" ".join(formatted_hashtags))
                    if formatted_mentions:
                        message_parts.append(" ".join(formatted_mentions))
                    message = "\n\n".join(message_parts)
                    
                    payload = {
                        "message": message,
                        "access_token": access_token,
                    }
                    if link:
                        payload["link"] = link
                        
                    resp = await client.post(f"{GRAPH_API_BASE}/{page_id}/feed", data=payload)
                    resp.raise_for_status()
                    data = resp.json()

                return {
                    "platform_post_id": data.get("id", ""),
                    "url": f"https://facebook.com/{data.get('id', '')}",
                    "raw_response": data,
                }
        except Exception as e:
            logger.error(f"Meta publish_post failed: {e}")
            raise

    async def delete_post(self, account: dict, platform_post_id: str) -> bool:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return True
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.delete(
                    f"{GRAPH_API_BASE}/{platform_post_id}",
                    params={"access_token": access_token}
                )
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Meta delete_post failed: {e}")
            return False

    async def fetch_post_analytics(self, account: dict, platform_post_id: str) -> dict:
        access_token = account.get("access_token", "")
        # if not access_token or access_token.startswith("mock_"):
        #     return self._mock_response("fetch_post_analytics",
        #         impressions=1250, reach=980, likes=67, comments=12, shares=8, clicks=45,
        #         engagement_rate=6.96
        #     )

        impressions = 0
        reach = 0
        clicks = 0
        likes = 0
        comments = 0
        shares = 0
        got_insights = False
        got_interactions = False

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # 1. Fetch post-level insights (requires Page access token + pages_read_engagement)
                #    Metrics: post_impressions (total views), post_impressions_unique (true reach), post_clicks
                try:
                    resp = await client.get(
                        f"{GRAPH_API_BASE}/{platform_post_id}/insights",
                        params={
                            "metric": "post_impressions,post_impressions_unique,post_clicks",
                            "access_token": access_token,
                        }
                    )
                    if resp.status_code == 200:
                        ins_data = resp.json()
                        if "error" not in ins_data:
                            metrics_map = {}
                            for item in ins_data.get("data", []):
                                name = item.get("name", "")
                                val = item.get("values", [{}])
                                value = val[0].get("value", 0) if val else 0
                                metrics_map[name] = value
                            impressions = metrics_map.get("post_impressions", 0)
                            reach = metrics_map.get("post_impressions_unique", 0)  # true unique reach
                            clicks = metrics_map.get("post_clicks", 0)
                            got_insights = bool(impressions or reach or clicks)
                            logger.info(f"[Meta] Insights for {platform_post_id}: impressions={impressions}, reach={reach}, clicks={clicks}")
                        else:
                            logger.warning(f"[Meta] Insights API error for {platform_post_id}: {ins_data.get('error')}")
                    else:
                        err_body = resp.text[:300]
                        logger.warning(f"[Meta] Insights HTTP {resp.status_code} for {platform_post_id}: {err_body}")
                except Exception as ie:
                    logger.warning(f"[Meta] Insights fetch exception for {platform_post_id}: {ie}")

                # 2. Fetch public interaction counts (reactions, comments, shares)
                #    These work even with a user token on public Page posts
                try:
                    inter_resp = await client.get(
                        f"{GRAPH_API_BASE}/{platform_post_id}",
                        params={
                            "fields": "reactions.summary(true),comments.summary(true),shares",
                            "access_token": access_token,
                        }
                    )
                    if inter_resp.status_code == 200:
                        inter_data = inter_resp.json()
                        if "error" not in inter_data:
                            likes = inter_data.get("reactions", {}).get("summary", {}).get("total_count", 0)
                            comments = inter_data.get("comments", {}).get("summary", {}).get("total_count", 0)
                            shares = inter_data.get("shares", {}).get("count", 0)
                            got_interactions = True
                            logger.info(f"[Meta] Interactions for {platform_post_id}: likes={likes}, comments={comments}, shares={shares}")
                        else:
                            logger.warning(f"[Meta] Interactions API error for {platform_post_id}: {inter_data.get('error')}")
                    else:
                        logger.warning(f"[Meta] Interactions HTTP {inter_resp.status_code} for {platform_post_id}: {inter_resp.text[:300]}")
                except Exception as ie:
                    logger.warning(f"[Meta] Interactions fetch exception for {platform_post_id}: {ie}")

        except Exception as e:
            logger.error(f"[Meta] fetch_post_analytics outer exception for {platform_post_id}: {e}")

        # ── REAL DATA ONLY ───────────────────────────────────────────────────
        # Only use numbers that came directly from the Meta API.
        # No static estimates or baseline guesses.
        total_interactions = likes + comments + shares + clicks

        engagement_rate = 0.0
        if impressions > 0:
            engagement_rate = round((total_interactions / impressions) * 100, 2)
        elif reach > 0:
            engagement_rate = round((total_interactions / reach) * 100, 2)

        logger.info(
            f"[Meta] Final analytics for {platform_post_id}: "
            f"impressions={impressions}, reach={reach}, likes={likes}, "
            f"comments={comments}, shares={shares}, clicks={clicks}, "
            f"engagement_rate={engagement_rate}%"
        )

        return {
            "impressions": impressions,
            "reach": reach,
            "likes": likes,
            "comments": comments,
            "shares": shares,
            "clicks": clicks,
            "engagement_rate": engagement_rate,
        }


    async def fetch_account_analytics(self, account: dict, date_from: str, date_to: str) -> dict:
        return self._mock_response("fetch_account_analytics",
            followers=5420, impressions=45000, engagement_rate=3.2,
            date_from=date_from, date_to=date_to
        )

    async def validate_credentials(self, credential: dict) -> tuple:
        app_id = credential.get("app_id") or credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")
        if not app_id or not client_secret:
            return False, "App ID and Client Secret are required"

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(f"{GRAPH_API_BASE}/oauth/access_token", params={
                    "client_id": app_id,
                    "client_secret": client_secret,
                    "grant_type": "client_credentials",
                })
                if resp.status_code == 200:
                    return True, "Meta credentials validated successfully"
                return False, f"Validation failed: {resp.text[:200]}"
        except Exception as e:
            return False, f"Connection error: {str(e)}"

    async def validate_media(self, mime_type: str, file_size_bytes: int, width: int, height: int) -> tuple:
        max_image_size = 10 * 1024 * 1024  # 10MB
        max_video_size = 1024 * 1024 * 1024  # 1GB
        if mime_type.startswith("image/") and file_size_bytes > max_image_size:
            return False, "Image must be under 10MB for Meta"
        if mime_type.startswith("video/") and file_size_bytes > max_video_size:
            return False, "Video must be under 1GB for Meta"
        return True, "Media accepted for Meta"
