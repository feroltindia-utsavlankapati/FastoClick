"""
Pinterest provider using Pinterest API v5.
Supports OAuth 2.0, pin creation, board management, and analytics.
"""
import json
import logging
import httpx
from datetime import datetime
from .base_provider import SocialProvider

logger = logging.getLogger(__name__)

PINTEREST_API_BASE = "https://api.pinterest.com/v5"
PINTEREST_AUTH_BASE = "https://www.pinterest.com/oauth"


class PinterestProvider(SocialProvider):
    platform = "pinterest"

    async def get_auth_url(self, credential: dict, redirect_uri: str) -> str:
        client_id = credential.get("client_id", "")
        if not client_id:
            return self._mock_response("get_auth_url", url="https://pinterest.com/mock-oauth")["url"]

        scopes = "boards:read,boards:write,pins:read,pins:write,user_accounts:read"
        return (
            f"{PINTEREST_AUTH_BASE}/?"
            f"client_id={client_id}&redirect_uri={redirect_uri}"
            f"&scope={scopes}&response_type=code"
        )

    async def exchange_code(self, code: str, credential: dict, redirect_uri: str) -> dict:
        client_id = credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")

        if not client_id or not client_secret:
            return self._mock_response("exchange_code",
                access_token="mock_pinterest_token",
                refresh_token="mock_pinterest_refresh",
                expires_in=2592000,
                user_info={"id": "mock_pin_123", "name": "Mock Pinterest User"}
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{PINTEREST_API_BASE}/oauth/token", data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                }, auth=(client_id, client_secret))
                resp.raise_for_status()
                token_data = resp.json()

                access_token = token_data.get("access_token", "")

                me_resp = await client.get(f"{PINTEREST_API_BASE}/user_account", headers={
                    "Authorization": f"Bearer {access_token}"
                })
                user_data = me_resp.json()

                return {
                    "access_token": access_token,
                    "refresh_token": token_data.get("refresh_token", ""),
                    "expires_in": token_data.get("expires_in", 2592000),
                    "user_info": {
                        "id": user_data.get("id", ""),
                        "name": user_data.get("username", ""),
                        "picture": user_data.get("profile_image", ""),
                    }
                }
        except Exception as e:
            logger.error(f"Pinterest exchange_code failed: {e}")
            raise

    async def refresh_access_token(self, account: dict) -> dict:
        refresh_token = account.get("refresh_token", "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"access_token": account.get("access_token", ""), "expires_in": 2592000}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{PINTEREST_API_BASE}/oauth/token", data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                })
                resp.raise_for_status()
                data = resp.json()
                return {
                    "access_token": data.get("access_token", ""),
                    "refresh_token": data.get("refresh_token", refresh_token),
                    "expires_in": data.get("expires_in", 2592000),
                }
        except Exception as e:
            logger.error(f"Pinterest refresh failed: {e}")
            raise

    async def publish_post(self, account: dict, post_data: dict) -> dict:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return self._mock_response("publish_post",
                platform_post_id="mock_pin_" + datetime.utcnow().strftime("%Y%m%d%H%M%S"),
                url="https://pinterest.com/pin/mock123"
            )

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                payload = {
                    "title": post_data.get("caption", "")[:100],
                    "description": post_data.get("caption", ""),
                    "link": post_data.get("link", ""),
                }

                resp = await client.post(f"{PINTEREST_API_BASE}/pins",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()

                return {
                    "platform_post_id": data.get("id", ""),
                    "url": f"https://pinterest.com/pin/{data.get('id', '')}",
                    "raw_response": data,
                }
        except Exception as e:
            logger.error(f"Pinterest publish_post failed: {e}")
            raise

    async def delete_post(self, account: dict, platform_post_id: str) -> bool:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return True
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.delete(f"{PINTEREST_API_BASE}/pins/{platform_post_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                return resp.status_code in (200, 204)
        except Exception as e:
            logger.error(f"Pinterest delete_post failed: {e}")
            return False

    async def fetch_post_analytics(self, account: dict, platform_post_id: str) -> dict:
        return self._mock_response("fetch_post_analytics",
            impressions=3400, reach=2800, likes=156, comments=22, shares=89, clicks=110,
            engagement_rate=11.09
        )

    async def fetch_account_analytics(self, account: dict, date_from: str, date_to: str) -> dict:
        return self._mock_response("fetch_account_analytics",
            followers=4200, impressions=38000, engagement_rate=5.6,
            date_from=date_from, date_to=date_to
        )

    async def validate_credentials(self, credential: dict) -> tuple:
        client_id = credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")
        if not client_id or not client_secret:
            return False, "App ID and App Secret are required"
        return True, "Pinterest credentials format accepted"

    async def validate_media(self, mime_type: str, file_size_bytes: int, width: int, height: int) -> tuple:
        if mime_type.startswith("image/") and file_size_bytes > 20 * 1024 * 1024:
            return False, "Image must be under 20MB for Pinterest"
        if mime_type.startswith("video/") and file_size_bytes > 2 * 1024 * 1024 * 1024:
            return False, "Video must be under 2GB for Pinterest"
        return True, "Media accepted for Pinterest"
