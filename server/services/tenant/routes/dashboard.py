from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from shared.schemas.responses import APIResponse
from shared.dependencies import get_current_tenant, TenantContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from shared.database import async_session_maker
from shared.models.tenant import User, Tenant
from fastapi.responses import FileResponse
import os

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
                "profile_image_url": user.profile_image_url,
                "timezone": user.timezone or "UTC",
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

@router.put("/profile", response_model=APIResponse[dict])
async def update_profile(
    timezone: str = Form(...),
    profile_image: UploadFile = File(None),
    tenant_ctx: TenantContext = Depends(get_current_tenant)
):
    async with async_session_maker() as db:
        result = await db.execute(select(User).where(User.id == tenant_ctx.user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        user.timezone = timezone
        
        if profile_image:
            # Save file locally
            media_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 
                "media_uploads"
            )
            os.makedirs(media_dir, exist_ok=True)
            
            # Validate file type
            allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
            content_type = profile_image.content_type or ""
            if content_type not in allowed_types:
                raise HTTPException(status_code=400, detail="Unsupported image format")
            
            ext = os.path.splitext(profile_image.filename or "avatar.png")[1] or ".png"
            filename = f"profile_{user.id}{ext}"
            file_path = os.path.join(media_dir, filename)
            
            # Read bytes and save
            bytes_content = await profile_image.read()
            with open(file_path, "wb") as f:
                f.write(bytes_content)
            
            # Save the URL in the database
            user.profile_image_url = f"http://localhost:8000/tenant/profile/image/{filename}"
            
        await db.commit()
        await db.refresh(user)
        
        updated_user = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "profile_image_url": user.profile_image_url,
            "timezone": user.timezone,
        }
        
    return APIResponse(success=True, data={"user": updated_user})

@router.get("/profile/image/{filename}")
async def serve_profile_image(filename: str):
    media_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 
        "media_uploads"
    )
    file_path = os.path.join(media_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    ext = os.path.splitext(filename)[1].lower()
    mime_type = "image/png"
    if ext in (".jpg", ".jpeg"):
        mime_type = "image/jpeg"
    elif ext == ".gif":
        mime_type = "image/gif"
    elif ext == ".webp":
        mime_type = "image/webp"
        
    return FileResponse(file_path, media_type=mime_type)

