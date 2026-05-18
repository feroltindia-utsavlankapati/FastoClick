from fastapi import APIRouter
from shared.schemas.responses import APIResponse

router = APIRouter(tags=["OAuth"])

@router.get("/authorize/{provider}", response_model=APIResponse[dict])
async def oauth_authorize(provider: str):
    return APIResponse(success=True, data={"url": f"https://oauth.provider.com/auth?client_id=123&redirect_uri=..."})

@router.get("/callback/{provider}", response_model=APIResponse[dict])
async def oauth_callback(provider: str, code: str):
    return APIResponse(success=True, data={"token": f"dummy-{provider}-token"})
