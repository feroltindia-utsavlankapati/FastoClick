from fastapi import APIRouter, Depends
from shared.schemas.responses import APIResponse
from shared.dependencies import get_current_tenant, TenantContext

router = APIRouter(tags=["Tokens"])

@router.post("/refresh", response_model=APIResponse[dict])
async def refresh_token(tenant: TenantContext = Depends(get_current_tenant)):
    return APIResponse(success=True, data={"token": "new-dummy-jwt-token"})
