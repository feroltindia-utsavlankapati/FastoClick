from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from shared.dependencies import get_current_tenant, TenantContext
from services.agent_orchestrator.agents.trends_agent import analyze_trends_live, generate_idea_from_trend

router = APIRouter()

class TrendAnalysisRequest(BaseModel):
    platform: str
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    niche: Optional[str] = None

class TrendIdeaRequest(BaseModel):
    platform: str
    trend_topic: str

@router.post("/analyze")
async def analyze_trends(req: TrendAnalysisRequest, tenant: TenantContext = Depends(get_current_tenant)):
    """
    Analyzes live trends for a specific platform and location.
    """
    try:
        results = await analyze_trends_live(
            tenant_id=tenant.id,
            platform=req.platform,
            country=req.country or "",
            state=req.state or "",
            city=req.city or "",
            niche=req.niche or ""
        )
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-idea")
async def generate_idea(req: TrendIdeaRequest, tenant: TenantContext = Depends(get_current_tenant)):
    """
    Generates a specific content idea based on a single trend topic.
    """
    try:
        results = await generate_idea_from_trend(
            tenant_id=tenant.id,
            platform=req.platform,
            trend_topic=req.trend_topic
        )
        return {"success": True, "data": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
