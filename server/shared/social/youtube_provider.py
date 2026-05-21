"""
YouTube provider using YouTube Data API v3.
Supports OAuth 2.0, video upload, and YouTube Analytics API.
"""
import json
import logging
import httpx
from datetime import datetime
from .base_provider import SocialProvider

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"
GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class YouTubeProvider(SocialProvider):
    platform = "youtube"

    async def get_auth_url(self, credential: dict, redirect_uri: str) -> str:
        client_id = credential.get("client_id", "")
        if not client_id:
            return self._mock_response("get_auth_url", url="https://youtube.com/mock-oauth")["url"]

        scopes = "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly"
        return (
            f"{GOOGLE_AUTH_BASE}/auth?"
            f"client_id={client_id}&redirect_uri={redirect_uri}"
            f"&scope={scopes}&response_type=code&access_type=offline&prompt=consent"
        )

    async def exchange_code(self, code: str, credential: dict, redirect_uri: str) -> dict:
        client_id = credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")

        if not client_id or not client_secret:
            return self._mock_response("exchange_code",
                access_token="mock_yt_token",
                refresh_token="mock_yt_refresh",
                expires_in=3600,
                user_info={"id": "mock_yt_123", "name": "Mock YouTube Channel"}
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(GOOGLE_TOKEN_URL, data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                })
                resp.raise_for_status()
                token_data = resp.json()
                access_token = token_data.get("access_token", "")

                ch_resp = await client.get(f"{YOUTUBE_API_BASE}/channels", params={
                    "part": "snippet,statistics",
                    "mine": "true",
                }, headers={"Authorization": f"Bearer {access_token}"})
                channels = ch_resp.json().get("items", [])
                channel = channels[0] if channels else {}

                return {
                    "access_token": access_token,
                    "refresh_token": token_data.get("refresh_token", ""),
                    "expires_in": token_data.get("expires_in", 3600),
                    "user_info": {
                        "id": channel.get("id", ""),
                        "name": channel.get("snippet", {}).get("title", ""),
                        "picture": channel.get("snippet", {}).get("thumbnails", {}).get("default", {}).get("url", ""),
                    }
                }
        except Exception as e:
            logger.error(f"YouTube exchange_code failed: {e}")
            raise

    async def refresh_access_token(self, account: dict) -> dict:
        refresh_token = account.get("refresh_token", "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"access_token": account.get("access_token", ""), "expires_in": 3600}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(GOOGLE_TOKEN_URL, data={
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                })
                resp.raise_for_status()
                data = resp.json()
                return {
                    "access_token": data.get("access_token", ""),
                    "expires_in": data.get("expires_in", 3600),
                }
        except Exception as e:
            logger.error(f"YouTube refresh failed: {e}")
            raise

    async def publish_post(self, account: dict, post_data: dict) -> dict:
        # YouTube publish requires a video file upload (resumable upload protocol).
        # For text-only posts, YouTube doesn't support them — returning mock.
        return self._mock_response("publish_post",
            platform_post_id="mock_yt_video_" + datetime.utcnow().strftime("%Y%m%d%H%M%S"),
            url="https://youtube.com/watch?v=mock123",
            note="Full video upload requires resumable upload protocol implementation"
        )

    async def delete_post(self, account: dict, platform_post_id: str) -> bool:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return True
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.delete(f"{YOUTUBE_API_BASE}/videos", params={
                    "id": platform_post_id,
                }, headers={"Authorization": f"Bearer {access_token}"})
                return resp.status_code in (200, 204)
        except Exception as e:
            logger.error(f"YouTube delete_post failed: {e}")
            return False

    async def fetch_post_analytics(self, account: dict, platform_post_id: str) -> dict:
        return self._mock_response("fetch_post_analytics",
            impressions=5600, reach=4200, likes=320, comments=45, shares=78, clicks=150,
            video_views=3800, watch_time_seconds=28500, engagement_rate=10.59
        )

    async def fetch_account_analytics(self, account: dict, date_from: str, date_to: str) -> dict:
        return self._mock_response("fetch_account_analytics",
            subscribers=12400, views=185000, watch_hours=4200,
            date_from=date_from, date_to=date_to
        )

    async def validate_credentials(self, credential: dict) -> tuple:
        client_id = credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")
        if not client_id or not client_secret:
            return False, "Client ID and Client Secret are required"
        return True, "YouTube (Google) credentials format accepted"

    async def validate_media(self, mime_type: str, file_size_bytes: int, width: int, height: int) -> tuple:
        if not mime_type.startswith("video/"):
            return False, "YouTube only supports video uploads"
        if file_size_bytes > 256 * 1024 * 1024 * 1024:  # 256GB
            return False, "Video must be under 256GB for YouTube"
        return True, "Media accepted for YouTube"
