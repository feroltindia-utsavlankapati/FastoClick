from fastapi import APIRouter, Depends
from shared.schemas.responses import APIResponse
from shared.dependencies import get_current_tenant, TenantContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from shared.database import async_session_maker
from shared.models.tenant import User, Tenant

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard", response_model=APIResponse[dict])
async def get_dashboard(
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    # Retrieve more details from the DB if needed
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == tenant_ctx.user_id))
        user = result.scalars().first()
        
        tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_ctx.id))
        tenant = tenant_result.scalars().first()
        
        dashboard_data = {
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
            "tenant": {
                "id": tenant.id,
                "name": tenant.name,
                "plan": tenant.plan,
                "created_at": tenant.created_at.isoformat() if tenant.created_at else None
            },
            "stats": {
                "active_campaigns": 0,
                "total_leads": 0,
                "monthly_spend": 0.0
            }
        }
        
    return APIResponse(success=True, data=dashboard_data)
