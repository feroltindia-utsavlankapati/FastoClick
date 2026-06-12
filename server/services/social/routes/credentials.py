"""
REST endpoints for managing developer API credentials per platform.
Credentials are encrypted before storage and redacted on read.
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from shared.database import async_session_maker
from shared.models.tenant import SocialPlatformCredential
from shared.dependencies import get_current_tenant, TenantContext
from shared.utils.security import encrypt_token, decrypt_token
from shared.social.provider_registry import get_provider, list_platforms, PLATFORM_DISPLAY_NAMES

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/credentials/{tenant_id}")
async def list_credentials(
    tenant_id: str,
    project_id: str = None,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """List all platform credentials for a tenant (secrets redacted)."""
    try:
        async with async_session_maker() as session:
            query = select(SocialPlatformCredential).where(
                SocialPlatformCredential.tenant_id == tenant_id
            )
            if project_id:
                query = query.where(SocialPlatformCredential.project_id == project_id)
            
            result = await session.execute(query)
            creds = result.scalars().all()

            data = []
            for c in creds:
                client_id = ""
                try:
                    client_id = decrypt_token(c.client_id_enc) if c.client_id_enc else ""
                except Exception:
                    client_id = "••••••"

                additional_config = {}
                if c.additional_config_enc:
                    try:
                        additional_config = json.loads(decrypt_token(c.additional_config_enc))
                    except Exception:
                        pass

                data.append({
                    "id": c.id,
                    "platform": c.platform,
                    "platform_name": PLATFORM_DISPLAY_NAMES.get(c.platform, c.platform),
                    "client_id": client_id[:8] + "••••" if len(client_id) > 8 else client_id,
                    "client_secret": "••••••••" if c.client_secret_enc else "",
                    "app_id": c.app_id or "",
                    "redirect_uri": c.redirect_uri or "",
                    "webhook_url": c.webhook_url or "",
                    "additional_config": additional_config,
                    "is_validated": c.is_validated,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                })

            return {"success": True, "data": data, "platforms": list_platforms()}
    except Exception as e:
        logger.error(f"Failed to list credentials: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credentials")
async def save_credential(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Save or update credentials for a platform."""
    tenant_id = payload.get("tenant_id", "")
    project_id = payload.get("project_id", "")
    platform = payload.get("platform", "")
    client_id = payload.get("client_id", "")
    client_secret = payload.get("client_secret", "")
    app_id = payload.get("app_id", "")
    redirect_uri = payload.get("redirect_uri", "")
    webhook_url = payload.get("webhook_url", "")
    additional_config = payload.get("additional_config", {})

    if not tenant_id or not platform:
        raise HTTPException(status_code=400, detail="tenant_id and platform are required")

    try:
        async with async_session_maker() as session:
            # Check if credential already exists for this tenant+platform
            result = await session.execute(
                select(SocialPlatformCredential).where(
                    SocialPlatformCredential.tenant_id == tenant_id,
                    SocialPlatformCredential.platform == platform
                )
            )
            existing = result.scalars().first()

            if existing:
                if client_id:
                    existing.client_id_enc = encrypt_token(client_id)
                if client_secret:
                    existing.client_secret_enc = encrypt_token(client_secret)
                if app_id:
                    existing.app_id = app_id
                existing.redirect_uri = redirect_uri
                existing.webhook_url = webhook_url
                if additional_config:
                    existing.additional_config_enc = encrypt_token(json.dumps(additional_config))
                existing.is_validated = False  # Reset validation on update
            else:
                cred = SocialPlatformCredential(
                    tenant_id=tenant_id,
                    project_id=project_id,
                    platform=platform,
                    client_id_enc=encrypt_token(client_id) if client_id else None,
                    client_secret_enc=encrypt_token(client_secret) if client_secret else None,
                    app_id=app_id or None,
                    redirect_uri=redirect_uri or None,
                    webhook_url=webhook_url or None,
                    additional_config_enc=encrypt_token(json.dumps(additional_config)) if additional_config else None,
                )
                session.add(cred)

            await session.commit()

        return {"success": True, "message": f"{platform} credentials saved successfully"}
    except Exception as e:
        logger.error(f"Failed to save credential: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/credentials/validate")
async def validate_credential(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Test credentials against the platform API."""
    tenant_id = payload.get("tenant_id", "")
    platform = payload.get("platform", "")

    if not tenant_id or not platform:
        raise HTTPException(status_code=400, detail="tenant_id and platform are required")

    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(SocialPlatformCredential).where(
                    SocialPlatformCredential.tenant_id == tenant_id,
                    SocialPlatformCredential.platform == platform
                )
            )
            cred = result.scalars().first()

            if not cred:
                return {"success": False, "message": "No credentials found for this platform"}

            provider = get_provider(platform)
            if not provider:
                return {"success": False, "message": f"Platform '{platform}' is not supported"}

            cred_data = {
                "client_id": decrypt_token(cred.client_id_enc) if cred.client_id_enc else "",
                "client_secret": decrypt_token(cred.client_secret_enc) if cred.client_secret_enc else "",
                "app_id": cred.app_id or "",
            }

            is_valid, message = await provider.validate_credentials(cred_data)

            if is_valid:
                cred.is_validated = True
                await session.commit()

            return {"success": is_valid, "message": message}
    except Exception as e:
        logger.error(f"Credential validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/credentials/{credential_id}")
async def delete_credential(credential_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Remove credentials for a platform."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(SocialPlatformCredential).where(SocialPlatformCredential.id == credential_id)
            )
            cred = result.scalars().first()
            if not cred:
                raise HTTPException(status_code=404, detail="Credential not found")

            await session.delete(cred)
            await session.commit()

        return {"success": True, "message": "Credential deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete credential: {e}")
        raise HTTPException(status_code=500, detail=str(e))
