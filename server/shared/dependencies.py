from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from shared.database import async_session_maker
from shared.utils.security import decode_access_token
from shared.models.tenant import User, Tenant
from shared.config import get_settings

settings = get_settings()

async def verify_internal_access(x_internal_token: str = Header(None)):
    if x_internal_token != settings.INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Forbidden: Internal Access Only")

class TenantContext:
    def __init__(self, id: str, plan: str, user_id: str):
        self.id = id
        self.plan = plan
        self.user_id = user_id

async def get_db():
    async with async_session_maker() as session:
        yield session

async def get_current_tenant(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
) -> TenantContext:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if not payload or "sub" not in payload:
        raise HTTPException(401, "Invalid or expired token")
        
    user_id = payload.get("sub")
    
    # Query database to confirm user and tenant
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user or not user.is_active:
        raise HTTPException(401, "User not found or inactive")
        
    # Get tenant plan
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == user.tenant_id))
    tenant = tenant_result.scalars().first()
    
    if not tenant:
        raise HTTPException(401, "Tenant not found")
        
    return TenantContext(id=tenant.id, plan=tenant.plan, user_id=user.id)

