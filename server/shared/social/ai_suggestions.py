"""
AI-powered features for social media content using the existing AI infrastructure.
Generates captions, suggests hashtags, and recommends optimal posting times.
"""
import json
import logging
import httpx
import os
from shared.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def _call_ai(system_prompt: str, user_prompt: str) -> str:
    """Call AI model via OpenRouter API."""
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not configured, returning mock response")
        return ""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEFAULT_MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "max_tokens": 1024,
                    "temperature": 0.7,
                },
            )
            data = response.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        logger.error(f"AI call failed: {e}")
        return ""


async def generate_caption(
    context: str,
    platform: str = "general",
    tone: str = "professional",
    product_info: str = "",
) -> dict:
    """Generate an AI caption for a social media post."""
    platform_guidelines = {
        "facebook": "Facebook: Informative, engaging, conversational. Best with images/videos, clear call-to-action. Up to 63,206 chars.",
        "instagram": "Instagram: High-quality visual focus. Engaging and aesthetically pleasing captions. Up to 2200 chars. Use emojis strategically and list tags at the bottom.",
        "meta": "Facebook/Instagram: Up to 2200 chars for Instagram, engaging and visual-focused. Use emojis strategically.",
        "twitter": "X/Twitter: Max 280 characters. Concise, impactful, conversational.",
        "linkedin": "LinkedIn: Professional tone, thought leadership, up to 3000 chars. Use line breaks for readability.",
        "youtube": "YouTube: Descriptive, keyword-rich, up to 5000 chars. Include key timestamps if relevant.",
        "tiktok": "TikTok: Short, trendy, casual. Use trending sounds/challenges references. Max 2200 chars.",
        "pinterest": "Pinterest: Keyword-rich, descriptive, inspiring. 500 chars optimal.",
    }

    guideline = platform_guidelines.get(platform, "General social media post. Engaging and shareable.")

    system_prompt = f"""You are an expert social media copywriter. Generate a compelling caption for a {platform} post.

Tone: {tone}
Platform guidelines: {guideline}

Rules:
- Write ONLY the caption text, no explanations
- Match the tone and platform style perfectly
- Include a call-to-action when appropriate
- Make it engaging and shareable"""

    user_prompt = f"Content context: {context}"
    if product_info:
        user_prompt += f"\nProduct/Service: {product_info}"

    result = await _call_ai(system_prompt, user_prompt)

    if not result:
        # Mock response when AI is unavailable
        mock_captions = {
            "facebook": f"✨ {context[:100]}... \n\nCheck out the link in our bio/comments! 👇 #marketing #digital",
            "instagram": f"✨ {context[:100]}... \n\nDouble tap if you agree! 👇 #marketing #digital",
            "meta": f"✨ {context[:100]}... \n\nDouble tap if you agree! 👇 #marketing #digital",
            "twitter": f"🚀 {context[:200]}... #marketing",
            "linkedin": f"I've been thinking about {context[:150]}...\n\nHere's what I've learned →",
            "youtube": f"{context[:200]} | Full breakdown in this video!",
            "tiktok": f"POV: {context[:100]} 🔥 #fyp #viral",
            "pinterest": f"{context[:200]} | Save for later! 📌",
        }
        result = mock_captions.get(platform, f"📣 {context[:200]}")

    return {"caption": result.strip(), "platform": platform, "tone": tone}


async def suggest_hashtags(
    caption: str,
    platform: str = "general",
    industry: str = "",
    count: int = 10,
) -> dict:
    """Suggest relevant hashtags based on caption content."""
    system_prompt = f"""You are a social media hashtag strategist. Suggest {count} relevant hashtags for a {platform} post.

Rules:
- Return ONLY a JSON array of hashtag strings (with # prefix)
- Mix popular (high volume) and niche (targeted) hashtags
- Ensure they're relevant to the content
- Platform: {platform}
- Industry: {industry or 'general'}
- Format: ["#hashtag1", "#hashtag2", ...]"""

    user_prompt = f"Post caption: {caption}"

    result = await _call_ai(system_prompt, user_prompt)

    hashtags = []
    if result:
        try:
            # Try to parse JSON array
            cleaned = result.strip()
            if cleaned.startswith("["):
                hashtags = json.loads(cleaned)
            else:
                # Extract hashtags from text
                import re
                hashtags = re.findall(r"#\w+", cleaned)
        except json.JSONDecodeError:
            import re
            hashtags = re.findall(r"#\w+", result)

    if not hashtags:
        # Mock hashtags
        base_tags = ["#marketing", "#digital", "#socialmedia", "#content", "#strategy"]
        industry_tags = {
            "tech": ["#tech", "#innovation", "#startup", "#AI", "#SaaS"],
            "ecommerce": ["#ecommerce", "#shopping", "#deals", "#retail", "#online"],
            "food": ["#foodie", "#recipe", "#cooking", "#yummy", "#chef"],
            "fitness": ["#fitness", "#workout", "#health", "#gym", "#motivation"],
        }
        hashtags = base_tags + industry_tags.get(industry.lower(), ["#business", "#growth", "#brand", "#trending", "#viral"])

    return {"hashtags": hashtags[:count], "platform": platform}


async def recommend_best_time(
    platform: str = "general",
    timezone: str = "UTC",
    industry: str = "",
) -> dict:
    """Recommend optimal posting times based on platform best practices."""
    # These are based on widely-published social media research
    # In production, this would analyze the account's own engagement data
    best_times = {
        "facebook": {
            "best_days": ["Tuesday", "Wednesday", "Friday"],
            "best_hours": ["9:00 AM", "1:00 PM", "3:00 PM"],
            "peak_engagement": "Wednesday 11:00 AM",
            "avoid": "Late night (11 PM - 5 AM)",
        },
        "instagram": {
            "best_days": ["Monday", "Tuesday", "Wednesday", "Friday"],
            "best_hours": ["11:00 AM", "1:00 PM", "5:00 PM"],
            "peak_engagement": "Wednesday 11:00 AM",
            "avoid": "Late night (11 PM - 5 AM)",
        },
        "meta": {
            "best_days": ["Tuesday", "Wednesday", "Friday"],
            "best_hours": ["9:00 AM", "1:00 PM", "3:00 PM"],
            "peak_engagement": "Wednesday 11:00 AM",
            "avoid": "Late night (11 PM - 5 AM)",
        },
        "twitter": {
            "best_days": ["Monday", "Tuesday", "Wednesday", "Thursday"],
            "best_hours": ["8:00 AM", "10:00 AM", "12:00 PM"],
            "peak_engagement": "Tuesday 9:00 AM",
            "avoid": "Weekends after 3 PM",
        },
        "linkedin": {
            "best_days": ["Tuesday", "Wednesday", "Thursday"],
            "best_hours": ["7:00 AM", "10:00 AM", "12:00 PM"],
            "peak_engagement": "Wednesday 10:00 AM",
            "avoid": "Weekends, late evenings",
        },
        "youtube": {
            "best_days": ["Thursday", "Friday", "Saturday"],
            "best_hours": ["12:00 PM", "3:00 PM", "5:00 PM"],
            "peak_engagement": "Friday 5:00 PM",
            "avoid": "Early morning weekdays",
        },
        "tiktok": {
            "best_days": ["Tuesday", "Thursday", "Friday"],
            "best_hours": ["7:00 AM", "10:00 AM", "7:00 PM"],
            "peak_engagement": "Thursday 7:00 PM",
            "avoid": "Monday mornings",
        },
        "pinterest": {
            "best_days": ["Saturday", "Sunday", "Friday"],
            "best_hours": ["8:00 PM", "9:00 PM", "11:00 PM"],
            "peak_engagement": "Saturday 9:00 PM",
            "avoid": "Weekday mornings",
        },
    }

    recommendation = best_times.get(platform, {
        "best_days": ["Tuesday", "Wednesday", "Thursday"],
        "best_hours": ["9:00 AM", "12:00 PM", "3:00 PM"],
        "peak_engagement": "Wednesday 12:00 PM",
        "avoid": "Late night hours",
    })

    return {
        "platform": platform,
        "timezone": timezone,
        "recommendation": recommendation,
        "note": "Recommendations based on industry best practices. For personalized timing, enable analytics sync to analyze your audience's engagement patterns.",
    }
