"""
Provider registry — maps platform names to their adapter instances.
Use get_provider('meta') to get the MetaProvider, etc.
"""
import logging
from typing import Optional
from .base_provider import SocialProvider

logger = logging.getLogger(__name__)

# Lazy initialization to avoid circular imports
_providers = {}


def _init_providers():
    global _providers
    if _providers:
        return

    from .facebook_provider import FacebookProvider
    from .instagram_provider import InstagramProvider
    from .twitter_provider import TwitterProvider
    from .linkedin_provider import LinkedInProvider
    from .youtube_provider import YouTubeProvider
    from .tiktok_provider import TikTokProvider
    from .pinterest_provider import PinterestProvider

    _providers = {
        "facebook": FacebookProvider(),
        "instagram": InstagramProvider(),
        "meta": FacebookProvider(),  # Keep for backward compatibility
        "twitter": TwitterProvider(),
        "linkedin": LinkedInProvider(),
        "youtube": YouTubeProvider(),
        "tiktok": TikTokProvider(),
        "pinterest": PinterestProvider(),
    }
    logger.info(f"Initialized {len(_providers)} social media providers")


def get_provider(platform: str) -> Optional[SocialProvider]:
    """Get the provider instance for a platform name."""
    _init_providers()
    provider = _providers.get(platform.lower())
    if not provider:
        logger.warning(f"No provider found for platform: {platform}")
    return provider


def list_platforms() -> list:
    """List all supported platform names."""
    _init_providers()
    # Return unique actual platforms (excluding meta alias for new listings)
    return [p for p in _providers.keys() if p != "meta"]


def list_all_platforms_including_legacy() -> list:
    """List all platform keys including legacy ones."""
    _init_providers()
    return list(_providers.keys())


PLATFORM_DISPLAY_NAMES = {
    "facebook": "Facebook",
    "instagram": "Instagram",
    "meta": "Meta (Facebook & Instagram Legacy)",
    "twitter": "X (Twitter)",
    "linkedin": "LinkedIn",
    "youtube": "YouTube",
    "tiktok": "TikTok",
    "pinterest": "Pinterest",
}

PLATFORM_COLORS = {
    "facebook": "#1877F2",
    "instagram": "#E1306C",
    "meta": "#1877F2",
    "twitter": "#000000",
    "linkedin": "#0A66C2",
    "youtube": "#FF0000",
    "tiktok": "#00F2EA",
    "pinterest": "#E60023",
}
