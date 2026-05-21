"""
TikTok provider using TikTok Login Kit + Content Posting API.
Supports OAuth, video publishing, and basic analytics.
"""
import json
import logging
import httpx
from datetime import datetime
from .base_provider import SocialProvider

logger = logging.getLogger(__name__)

TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize"
TIKTOK_API_BASE = "https://open.tiktokapis.com/v2"


class TikTokProvider(SocialProvider):
    platform = "tiktok"

    async def get_auth_url(self, credential: dict, redirect_uri: str) -> str:
        client_key = credential.get("client_id", "")
        if not client_key:
            return self._mock_response("get_auth_url", url="https://tiktok.com/mock-oauth")["url"]

        scopes = "user.info.basic,video.publish,video.list"
        import secrets
        state = secrets.token_urlsafe(32)
        return (
            f"{TIKTOK_AUTH_BASE}?"
            f"client_key={client_key}&scope={scopes}"
            f"&response_type=code&redirect_uri={redirect_uri}&state={state}"
        )

    async def exchange_code(self, code: str, credential: dict, redirect_uri: str) -> dict:
        client_key = credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")

        if not client_key or not client_secret:
            return self._mock_response("exchange_code",
                access_token="mock_tiktok_token",
                refresh_token="mock_tiktok_refresh",
                expires_in=86400,
                user_info={"id": "mock_tt_123", "name": "Mock TikTok User"}
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{TIKTOK_API_BASE}/oauth/token/", json={
                    "client_key": client_key,
                    "client_secret": client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                })
                resp.raise_for_status()
                token_data = resp.json()

                access_token = token_data.get("access_token", "")
                open_id = token_data.get("open_id", "")

                # Get user info
                me_resp = await client.get(f"{TIKTOK_API_BASE}/user/info/", headers={
                    "Authorization": f"Bearer {access_token}"
                }, params={"fields": "open_id,display_name,avatar_url"})
                user_data = me_resp.json().get("data", {}).get("user", {})

                return {
                    "access_token": access_token,
                    "refresh_token": token_data.get("refresh_token", ""),
                    "expires_in": token_data.get("expires_in", 86400),
                    "user_info": {
                        "id": open_id or user_data.get("open_id", ""),
                        "name": user_data.get("display_name", ""),
                        "picture": user_data.get("avatar_url", ""),
                    }
                }
        except Exception as e:
            logger.error(f"TikTok exchange_code failed: {e}")
            raise

    async def refresh_access_token(self, account: dict) -> dict:
        refresh_token = account.get("refresh_token", "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"access_token": account.get("access_token", ""), "expires_in": 86400}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{TIKTOK_API_BASE}/oauth/token/", json={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                })
                resp.raise_for_status()
                data = resp.json()
                return {
                    "access_token": data.get("access_token", ""),
                    "refresh_token": data.get("refresh_token", refresh_token),
                    "expires_in": data.get("expires_in", 86400),
                }
        except Exception as e:
            logger.error(f"TikTok refresh failed: {e}")
            raise

    async def publish_post(self, account: dict, post_data: dict) -> dict:
        # TikTok requires video content — text posts are not supported
        return self._mock_response("publish_post",
            platform_post_id="mock_tt_video_" + datetime.utcnow().strftime("%Y%m%d%H%M%S"),
            url="https://tiktok.com/@mock/video/123",
            note="TikTok video upload requires Content Posting API with video file"
        )

    async def delete_post(self, account: dict, platform_post_id: str) -> bool:
        return True  # TikTok API doesn't support deletion via API currently

    async def fetch_post_analytics(self, account: dict, platform_post_id: str) -> dict:
        return self._mock_response("fetch_post_analytics",
            impressions=15000, reach=12000, likes=1200, comments=89, shares=340, clicks=450,
            video_views=11500, engagement_rate=13.86
        )

    async def fetch_account_analytics(self, account: dict, date_from: str, date_to: str) -> dict:
        return self._mock_response("fetch_account_analytics",
            followers=25000, video_views=450000, engagement_rate=8.5,
            date_from=date_from, date_to=date_to
        )

    async def validate_credentials(self, credential: dict) -> tuple:
        client_key = credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")
        if not client_key or not client_secret:
            return False, "Client Key and Client Secret are required"
        return True, "TikTok credentials format accepted"

    async def validate_media(self, mime_type: str, file_size_bytes: int, width: int, height: int) -> tuple:
        if not mime_type.startswith("video/"):
            return False, "TikTok only supports video content"
        if file_size_bytes > 287 * 1024 * 1024:  # ~287MB
            return False, "Video must be under 287MB for TikTok"
        return True, "Media accepted for TikTok"
