from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.future import select
from sqlalchemy import delete
from shared.database import async_session_maker
from shared.models.tenant import StrategyPlan
from shared.dependencies import get_current_tenant, TenantContext
import json

router = APIRouter()


@router.get("/plans")
async def list_plans(tenant: TenantContext = Depends(get_current_tenant)):
    """Return all saved strategy plans for the authenticated tenant, newest first."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(StrategyPlan)
            .where(StrategyPlan.tenant_id == tenant.id)
            .order_by(StrategyPlan.created_at.desc())
        )
        plans = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id":           p.id,
                "company_name": p.company_name,
                "industry":     p.industry,
                "user_prompt":  p.user_prompt,
                "plan":         json.loads(p.plan_json),
                "created_at":   p.created_at.isoformat() if p.created_at else None
            }
            for p in plans
        ]
    }


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Permanently delete a strategy plan by ID (must belong to the authenticated tenant)."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(StrategyPlan).where(
                StrategyPlan.id == plan_id,
                StrategyPlan.tenant_id == tenant.id
            )
        )
        plan = result.scalars().first()

        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found or access denied.")

        await session.execute(
            delete(StrategyPlan).where(StrategyPlan.id == plan_id)
        )
        await session.commit()

    return {"success": True, "message": f"Plan {plan_id} permanently deleted."}
