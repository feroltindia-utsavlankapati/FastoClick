"""
Abstract base class defining the interface all social media platform adapters must implement.
Each platform (Meta, Twitter, LinkedIn, etc.) extends this to provide platform-specific logic.
"""
import logging
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)


class SocialProvider(ABC):
    """Abstract social media platform provider."""

    platform: str = ""  # e.g. "meta", "twitter", "linkedin"

    @abstractmethod
    async def get_auth_url(self, credential: dict, redirect_uri: str) -> str:
        """Generate the OAuth authorization URL for the platform."""
        ...

    @abstractmethod
    async def exchange_code(self, code: str, credential: dict, redirect_uri: str) -> dict:
        """
        Exchange an OAuth authorization code for access/refresh tokens.
        Returns: {"access_token": ..., "refresh_token": ..., "expires_in": ..., "user_info": {...}}
        """
        ...

    @abstractmethod
    async def refresh_access_token(self, account: dict) -> dict:
        """
        Refresh an expired access token.
        Returns: {"access_token": ..., "expires_in": ...}
        """
        ...

    @abstractmethod
    async def publish_post(self, account: dict, post_data: dict) -> dict:
        """
        Publish a post to the platform.
        post_data: {"caption": ..., "media_urls": [...], "link": ..., "hashtags": ...}
        Returns: {"platform_post_id": ..., "url": ..., "raw_response": {...}}
        """
        ...

    @abstractmethod
    async def delete_post(self, account: dict, platform_post_id: str) -> bool:
        """Delete a published post. Returns True on success."""
        ...

    @abstractmethod
    async def fetch_post_analytics(self, account: dict, platform_post_id: str) -> dict:
        """
        Fetch analytics for a specific post.
        Returns: {"impressions": ..., "reach": ..., "likes": ..., "comments": ..., "shares": ..., ...}
        """
        ...

    @abstractmethod
    async def fetch_account_analytics(self, account: dict, date_from: str, date_to: str) -> dict:
        """
        Fetch aggregate account-level analytics for a date range.
        Returns: {"followers": ..., "impressions": ..., "engagement_rate": ..., ...}
        """
        ...

    async def validate_credentials(self, credential: dict) -> tuple:
        """
        Validate developer credentials against the platform API.
        Returns: (is_valid: bool, message: str)
        """
        return True, f"{self.platform} credentials accepted (not validated against live API)"

    async def validate_media(self, mime_type: str, file_size_bytes: int, width: int, height: int) -> tuple:
        """
        Validate media against platform-specific requirements.
        Returns: (is_valid: bool, message: str)
        """
        return True, "Media accepted"

