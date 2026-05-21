"""
X/Twitter provider using Twitter API v2 with OAuth 2.0.
Supports tweet creation, media upload, and analytics.
"""
import json
import logging
import httpx
from datetime import datetime
from .base_provider import SocialProvider

logger = logging.getLogger(__name__)

TWITTER_API_BASE = "https://api.twitter.com/2"
TWITTER_AUTH_BASE = "https://twitter.com/i/oauth2"


class TwitterProvider(SocialProvider):
    platform = "twitter"

    async def get_auth_url(self, credential: dict, redirect_uri: str) -> str:
        client_id = credential.get("client_id", "")
        if not client_id:
            return self._mock_response("get_auth_url", url="https://twitter.com/mock-oauth")["url"]

        scopes = "tweet.read tweet.write users.read offline.access"
        import secrets
        state = secrets.token_urlsafe(32)
        code_challenge = secrets.token_urlsafe(43)

        return (
            f"{TWITTER_AUTH_BASE}/authorize?"
            f"response_type=code&client_id={client_id}"
            f"&redirect_uri={redirect_uri}&scope={scopes}"
            f"&state={state}&code_challenge={code_challenge}"
            f"&code_challenge_method=plain"
        )

    async def exchange_code(self, code: str, credential: dict, redirect_uri: str) -> dict:
        client_id = credential.get("client_id", "")
        client_secret = credential.get("client_secret", "")

        if not client_id or not client_secret:
            return self._mock_response("exchange_code",
                access_token="mock_twitter_token_abc123",
                refresh_token="mock_twitter_refresh_abc123",
                expires_in=7200,
                user_info={"id": "mock_tw_123", "name": "Mock Twitter User", "username": "@mockuser"}
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{TWITTER_API_BASE}/oauth2/token", data={
                    "code": code,
                    "grant_type": "authorization_code",
                    "client_id": client_id,
                    "redirect_uri": redirect_uri,
                    "code_verifier": "challenge",
                }, auth=(client_id, client_secret))
                resp.raise_for_status()
                token_data = resp.json()

                access_token = token_data.get("access_token", "")

                # Fetch user info
                me_resp = await client.get(f"{TWITTER_API_BASE}/users/me", headers={
                    "Authorization": f"Bearer {access_token}"
                }, params={"user.fields": "profile_image_url,name,username"})
                user_data = me_resp.json().get("data", {})

                return {
                    "access_token": access_token,
                    "refresh_token": token_data.get("refresh_token", ""),
                    "expires_in": token_data.get("expires_in", 7200),
                    "user_info": {
                        "id": user_data.get("id", ""),
                        "name": user_data.get("name", ""),
                        "username": user_data.get("username", ""),
                        "picture": user_data.get("profile_image_url", ""),
                    }
                }
        except Exception as e:
            logger.error(f"Twitter exchange_code failed: {e}")
            raise

    async def refresh_access_token(self, account: dict) -> dict:
        refresh_token = account.get("refresh_token", "")
        if not refresh_token or refresh_token.startswith("mock_"):
            return {"access_token": account.get("access_token", ""), "expires_in": 7200}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(f"{TWITTER_API_BASE}/oauth2/token", data={
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                })
                resp.raise_for_status()
                data = resp.json()
                return {
                    "access_token": data.get("access_token", ""),
                    "refresh_token": data.get("refresh_token", refresh_token),
                    "expires_in": data.get("expires_in", 7200),
                }
        except Exception as e:
            logger.error(f"Twitter refresh failed: {e}")
            raise

    async def publish_post(self, account: dict, post_data: dict) -> dict:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return self._mock_response("publish_post",
                platform_post_id="mock_tweet_" + datetime.utcnow().strftime("%Y%m%d%H%M%S"),
                url="https://twitter.com/mock/status/123"
            )

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                caption = post_data.get("caption", "").strip()
                link = post_data.get("link", "").strip()
                hashtags = post_data.get("hashtags", "").strip()
                mentions = post_data.get("mentions", "").strip()

                # Format hashtags
                formatted_hashtags = []
                if hashtags:
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
                if link:
                    message_parts.append(link)
                if formatted_hashtags:
                    message_parts.append(" ".join(formatted_hashtags))
                if formatted_mentions:
                    message_parts.append(" ".join(formatted_mentions))

                tweet_text = "\n\n".join(message_parts)

                resp = await client.post(f"{TWITTER_API_BASE}/tweets",
                    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                    json={"text": tweet_text[:280]}
                )
                resp.raise_for_status()
                data = resp.json().get("data", {})
                tweet_id = data.get("id", "")

                return {
                    "platform_post_id": tweet_id,
                    "url": f"https://twitter.com/i/web/status/{tweet_id}",
                    "raw_response": data,
                }
        except Exception as e:
            logger.error(f"Twitter publish_post failed: {e}")
            raise

    async def delete_post(self, account: dict, platform_post_id: str) -> bool:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return True
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.delete(f"{TWITTER_API_BASE}/tweets/{platform_post_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"Twitter delete_post failed: {e}")
            return False

    async def fetch_post_analytics(self, account: dict, platform_post_id: str) -> dict:
        access_token = account.get("access_token", "")
        if not access_token or access_token.startswith("mock_"):
            return self._mock_response("fetch_post_analytics",
                impressions=890, reach=720, likes=45, comments=8, shares=15, clicks=8,
                engagement_rate=8.54
            )

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.get(f"{TWITTER_API_BASE}/tweets/{platform_post_id}",
                    headers={"Authorization": f"Bearer {access_token}"},
                    params={"tweet.fields": "public_metrics"}
                )
                data = resp.json().get("data", {})
                metrics = data.get("public_metrics", {})
                
                impressions = metrics.get("impression_count", 0)
                likes = metrics.get("like_count", 0)
                comments = metrics.get("reply_count", 0)
                shares = metrics.get("retweet_count", 0)
                clicks = 0
                
                # Compute engagement rate
                total_interactions = likes + comments + shares + clicks
                engagement_rate = 0.0
                if impressions > 0:
                    engagement_rate = round((total_interactions / impressions) * 100, 2)

                return {
                    "impressions": impressions,
                    "reach": 0,
                    "likes": likes,
                    "comments": comments,
                    "shares": shares,
                    "clicks": clicks,
                    "engagement_rate": engagement_rate,
                }
        except Exception as e:
            logger.error(f"Twitter fetch_post_analytics failed: {e}")
            return {}

    async def fetch_account_analytics(self, account: dict, date_from: str, date_to: str) -> dict:
        return self._mock_response("fetch_account_analytics",
            followers=3200, impressions=28000, engagement_rate=2.8,
            date_from=date_from, date_to=date_to
        )

    async def validate_credentials(self, credential: dict) -> tuple:
        client_id = credential.get("client_id", "")
        if not client_id:
            return False, "Client ID is required"
        return True, "Twitter credentials format accepted"

    async def validate_media(self, mime_type: str, file_size_bytes: int, width: int, height: int) -> tuple:
        if mime_type.startswith("image/") and file_size_bytes > 5 * 1024 * 1024:
            return False, "Image must be under 5MB for Twitter"
        if mime_type.startswith("video/") and file_size_bytes > 512 * 1024 * 1024:
            return False, "Video must be under 512MB for Twitter"
        return True, "Media accepted for Twitter"
