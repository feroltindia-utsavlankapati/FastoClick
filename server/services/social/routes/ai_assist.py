"""
REST endpoints for AI-assisted social media content generation.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from shared.dependencies import get_current_tenant, TenantContext
from shared.social.ai_suggestions import generate_caption, suggest_hashtags, recommend_best_time
from shared.utils.ai_integration import AIClient

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/ai/caption")
async def ai_generate_caption(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Generate an AI-powered caption for a social media post."""
    context = payload.get("context", "")
    platform = payload.get("platform", "general")
    tone = payload.get("tone", "professional")
    product_info = payload.get("product_info", "")

    if not context:
        raise HTTPException(status_code=400, detail="context is required")

    try:
        result = await generate_caption(
            context=context,
            platform=platform,
            tone=tone,
            product_info=product_info,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Caption generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/hashtags")
async def ai_suggest_hashtags(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Suggest relevant hashtags for a post."""
    caption = payload.get("caption", "")
    platform = payload.get("platform", "general")
    industry = payload.get("industry", "")
    count = payload.get("count", 10)

    if not caption:
        raise HTTPException(status_code=400, detail="caption is required")

    try:
        result = await suggest_hashtags(
            caption=caption,
            platform=platform,
            industry=industry,
            count=count,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Hashtag suggestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/best-time")
async def ai_recommend_best_time(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Recommend optimal posting time for a platform."""
    platform = payload.get("platform", "general")
    timezone_str = payload.get("timezone", "UTC")
    industry = payload.get("industry", "")

    try:
        result = await recommend_best_time(
            platform=platform,
            timezone=timezone_str,
            industry=industry,
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Best time recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai/image")
async def ai_generate_image(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Generate an AI-powered image based on a raw idea."""
    raw_idea = payload.get("raw_idea", "")

    if not raw_idea:
        raise HTTPException(status_code=400, detail="raw_idea is required")

    try:
        image_url = await AIClient.generate_image_agentic(tenant.id, raw_idea)
        return {"success": True, "data": {"image_url": image_url}}
    except Exception as e:
        logger.error(f"Image generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
