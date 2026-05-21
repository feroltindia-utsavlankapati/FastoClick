"""
Facebook provider using Meta Graph API v21.0.
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


class FacebookProvider(SocialProvider):
    platform = "facebook"

    def _raise_for_status(self, response: httpx.Response, action_desc: str = "Request"):
        if response.status_code == 200:
            return
        
        try:
            err_data = response.json()
            error_info = err_data.get("error", {})
            error_msg = error_info.get("message", "Unknown Graph API error")
            error_code = error_info.get("code", "N/A")
            error_subcode = error_info.get("error_subcode", "N/A")
            fbtrace_id = error_info.get("fbtrace_id", "N/A")
            
            detailed_msg = (
                f"{action_desc} failed with status {response.status_code}. "
                f"Meta API Error: {error_msg} (Code: {error_code}, Subcode: {error_subcode}, Trace ID: {fbtrace_id})"
            )
            logger.error(detailed_msg)
            raise Exception(detailed_msg)
        except (ValueError, KeyError):
            response.raise_for_status()

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
        scopes = custom_scopes if custom_scopes else "pages_manage_posts,pages_read_engagement,pages_show_list,email"
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
                access_token="mock_facebook_token_abc123",
                refresh_token="",
                expires_in=5184000,
                user_info={"id": "mock_user_123", "name": "Mock Facebook User"},
                pages=[
                    {
                        "id": "mock_page_123",
                        "name": "Mock Facebook Page",
                        "access_token": "mock_facebook_token_abc123",
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
                self._raise_for_status(resp, "Token exchange")
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
                    logger.error(f"Failed to fetch Facebook pages: {pe}")

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
            logger.error(f"Facebook exchange_code failed: {e}")
            raise

    async def refresh_access_token(self, account: dict) -> dict:
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
                
                formatted_hashtags = []
                if hashtags:
                    for tag in [t.strip() for t in hashtags.replace(",", " ").split() if t.strip()]:
                        if not tag.startswith("#"):
                            formatted_hashtags.append(f"#{tag}")
                        else:
                            formatted_hashtags.append(tag)
                            
                formatted_mentions = []
                if mentions:
                    for mention in [m.strip() for m in mentions.replace(",", " ").split() if m.strip()]:
                        if not mention.startswith("@"):
                            formatted_mentions.append(f"@{mention}")
                        else:
                            formatted_mentions.append(mention)

                message_parts = []
                if caption:
                    message_parts.append(caption)

                media_files = post_data.get("media_files", [])
                
                if media_files:
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
                                self._raise_for_status(resp, "Facebook photo upload")
                                photo_id = resp.json().get("id")
                                if photo_id:
                                    photo_ids.append(photo_id)
                                    
                    if not photo_ids:
                        raise Exception("No valid image files could be uploaded to Facebook")

                    attached_media = [{"media_fbid": pid} for pid in photo_ids]
                    payload = {
                        "message": message,
                        "attached_media": json.dumps(attached_media),
                        "access_token": access_token
                    }
                    resp = await client.post(f"{GRAPH_API_BASE}/{page_id}/feed", data=payload)
                    self._raise_for_status(resp, "Facebook feed publish with media")
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
                    self._raise_for_status(resp, "Facebook feed publish")
                    data = resp.json()

                return {
                    "platform_post_id": data.get("id", ""),
                    "url": f"https://facebook.com/{data.get('id', '')}",
                    "raw_response": data,
                }
        except Exception as e:
            logger.error(f"Facebook publish_post failed: {e}")
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
            logger.error(f"Facebook delete_post failed: {e}")
            return False

    async def fetch_post_analytics(self, account: dict, platform_post_id: str) -> dict:
        access_token = account.get("access_token", "")
        impressions = 0
        reach = 0
        clicks = 0
        likes = 0
        comments = 0
        shares = 0

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
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
                            reach = metrics_map.get("post_impressions_unique", 0)
                            clicks = metrics_map.get("post_clicks", 0)
                except Exception as ie:
                    logger.warning(f"Facebook Insights fetch exception: {ie}")

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
                except Exception as ie:
                    logger.warning(f"Facebook Interactions fetch exception: {ie}")

        except Exception as e:
            logger.error(f"Facebook fetch_post_analytics exception: {e}")

        total_interactions = likes + comments + shares + clicks
        engagement_rate = 0.0
        if impressions > 0:
            engagement_rate = round((total_interactions / impressions) * 100, 2)
        elif reach > 0:
            engagement_rate = round((total_interactions / reach) * 100, 2)

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
                    return True, "Facebook credentials validated successfully"
                return False, f"Validation failed: {resp.text[:200]}"
        except Exception as e:
            return False, f"Connection error: {str(e)}"

    async def validate_media(self, mime_type: str, file_size_bytes: int, width: int, height: int) -> tuple:
        max_image_size = 10 * 1024 * 1024
        max_video_size = 1024 * 1024 * 1024
        if mime_type.startswith("image/") and file_size_bytes > max_image_size:
            return False, "Image must be under 10MB for Facebook"
        if mime_type.startswith("video/") and file_size_bytes > max_video_size:
            return False, "Video must be under 1GB for Facebook"
        return True, "Media accepted for Facebook"
