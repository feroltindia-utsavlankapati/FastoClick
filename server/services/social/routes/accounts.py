"""
REST endpoints for connected social accounts (OAuth flows + management).
"""
import json
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from shared.database import async_session_maker
from shared.models.tenant import ConnectedSocialAccount, SocialPlatformCredential
from shared.dependencies import get_current_tenant, TenantContext
from shared.utils.security import encrypt_token, decrypt_token
from shared.social.provider_registry import get_provider, PLATFORM_DISPLAY_NAMES

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/accounts/auth-url")
async def get_auth_url(
    tenant_id: str,
    platform: str,
    redirect_uri: str,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Generate OAuth redirect URL for a platform."""
    provider = get_provider(platform)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(SocialPlatformCredential).where(
                    SocialPlatformCredential.tenant_id == tenant_id,
                    SocialPlatformCredential.platform == platform
                )
            )
            cred = result.scalars().first()

            cred_data = {}
            if cred:
                additional_config = {}
                if cred.additional_config_enc:
                    try:
                        additional_config = json.loads(decrypt_token(cred.additional_config_enc))
                    except Exception:
                        pass
                cred_data = {
                    "client_id": decrypt_token(cred.client_id_enc) if cred.client_id_enc else "",
                    "client_secret": decrypt_token(cred.client_secret_enc) if cred.client_secret_enc else "",
                    "app_id": cred.app_id or "",
                    "additional_config": additional_config,
                }

            auth_url = await provider.get_auth_url(cred_data, redirect_uri)
            return {"success": True, "auth_url": auth_url}
    except Exception as e:
        logger.error(f"Failed to get auth URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/accounts/{tenant_id}")
async def list_accounts(
    tenant_id: str,
    project_id: str = None,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """List all connected social accounts for a tenant."""
    try:
        async with async_session_maker() as session:
            query = select(ConnectedSocialAccount).where(
                ConnectedSocialAccount.tenant_id == tenant_id
            )
            if project_id:
                query = query.where(ConnectedSocialAccount.project_id == project_id)
            
            result = await session.execute(query)
            accounts = result.scalars().all()

            data = []
            now = datetime.now(timezone.utc)
            for a in accounts:
                # Determine connection status
                status = "active"
                if a.token_expires_at:
                    expires = a.token_expires_at.replace(tzinfo=timezone.utc) if a.token_expires_at.tzinfo is None else a.token_expires_at
                    if expires < now:
                        status = "expired"
                    elif expires < now + timedelta(days=7):
                        status = "expiring_soon"

                data.append({
                    "id": a.id,
                    "platform": a.platform,
                    "platform_name": PLATFORM_DISPLAY_NAMES.get(a.platform, a.platform),
                    "account_name": a.account_name or "",
                    "account_handle": a.account_handle or "",
                    "profile_image_url": a.profile_image_url or "",
                    "is_active": a.is_active,
                    "status": status,
                    "token_expires_at": a.token_expires_at.isoformat() if a.token_expires_at else None,
                    "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None,
                    "created_at": a.created_at.isoformat() if a.created_at else None,
                })

            return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Failed to list accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts/callback")
async def oauth_callback(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Handle OAuth callback — exchange code for tokens and store the account."""
    tenant_id = payload.get("tenant_id", "")
    project_id = payload.get("project_id", "")
    platform = payload.get("platform", "")
    code = payload.get("code", "")
    redirect_uri = payload.get("redirect_uri", "")

    if not all([tenant_id, platform, code]):
        raise HTTPException(status_code=400, detail="tenant_id, platform, and code are required")

    provider = get_provider(platform)
    if not provider:
        raise HTTPException(status_code=400, detail=f"Unsupported platform: {platform}")

    try:
        async with async_session_maker() as session:
            # Get stored credentials
            result = await session.execute(
                select(SocialPlatformCredential).where(
                    SocialPlatformCredential.tenant_id == tenant_id,
                    SocialPlatformCredential.platform == platform
                )
            )
            cred = result.scalars().first()

            cred_data = {}
            if cred:
                additional_config = {}
                if cred.additional_config_enc:
                    try:
                        additional_config = json.loads(decrypt_token(cred.additional_config_enc))
                    except Exception:
                        pass
                cred_data = {
                    "client_id": decrypt_token(cred.client_id_enc) if cred.client_id_enc else "",
                    "client_secret": decrypt_token(cred.client_secret_enc) if cred.client_secret_enc else "",
                    "app_id": cred.app_id or "",
                    "additional_config": additional_config,
                }

            # Exchange code for tokens
            token_info = await provider.exchange_code(code, cred_data, redirect_uri)

            user_info = token_info.get("user_info", {})
            expires_in = token_info.get("expires_in", 3600)
            expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

            # Meta-specific handling for multiple managed pages
            pages = token_info.get("pages", [])
            if platform in ("facebook", "instagram", "meta") and pages:
                connected_accounts = []
                for page in pages:
                    page_id = page["id"]
                    page_name = page["name"]
                    page_token = page["access_token"]
                    page_pic = page["picture"]

                    result = await session.execute(
                        select(ConnectedSocialAccount).where(
                            ConnectedSocialAccount.tenant_id == tenant_id,
                            ConnectedSocialAccount.platform == platform,
                            ConnectedSocialAccount.platform_user_id == page_id
                        )
                    )
                    existing = result.scalars().first()

                    if existing:
                        existing.account_name = page_name
                        existing.account_handle = page_name
                        existing.profile_image_url = page_pic
                        existing.access_token_enc = encrypt_token(page_token)
                        existing.token_expires_at = expires_at
                        existing.is_active = True
                        connected_accounts.append(existing)
                    else:
                        new_acc = ConnectedSocialAccount(
                            tenant_id=tenant_id,
                            project_id=project_id,
                            platform=platform,
                            platform_user_id=page_id,
                            account_name=page_name,
                            account_handle=page_name,
                            profile_image_url=page_pic,
                            access_token_enc=encrypt_token(page_token),
                            refresh_token_enc=None,
                            token_expires_at=expires_at,
                            scopes=token_info.get("scopes", ""),
                            is_active=True,
                        )
                        session.add(new_acc)
                        connected_accounts.append(new_acc)
                
                await session.commit()
                
                return {
                    "success": True,
                    "message": f"Connected {len(connected_accounts)} Facebook page(s) successfully!",
                    "data": {
                        "platform": platform,
                        "count": len(connected_accounts)
                    }
                }

            # Standard flow fallback
            # Check if this account already exists
            result = await session.execute(
                select(ConnectedSocialAccount).where(
                    ConnectedSocialAccount.tenant_id == tenant_id,
                    ConnectedSocialAccount.platform == platform,
                    ConnectedSocialAccount.platform_user_id == user_info.get("id", "")
                )
            )
            existing = result.scalars().first()

            if existing:
                existing.account_name = user_info.get("name", "")
                existing.account_handle = user_info.get("username", user_info.get("name", ""))
                existing.profile_image_url = user_info.get("picture", "")
                existing.access_token_enc = encrypt_token(token_info.get("access_token", ""))
                existing.refresh_token_enc = encrypt_token(token_info.get("refresh_token", ""))
                existing.token_expires_at = expires_at
                existing.is_active = True
                account = existing
            else:
                account = ConnectedSocialAccount(
                    tenant_id=tenant_id,
                    project_id=project_id,
                    platform=platform,
                    platform_user_id=user_info.get("id", ""),
                    account_name=user_info.get("name", ""),
                    account_handle=user_info.get("username", user_info.get("name", "")),
                    profile_image_url=user_info.get("picture", ""),
                    access_token_enc=encrypt_token(token_info.get("access_token", "")),
                    refresh_token_enc=encrypt_token(token_info.get("refresh_token", "")),
                    token_expires_at=expires_at,
                    scopes=token_info.get("scopes", ""),
                    is_active=True,
                )
                session.add(account)

            await session.commit()
            await session.refresh(account)

            return {
                "success": True,
                "message": f"Connected {PLATFORM_DISPLAY_NAMES.get(platform, platform)} account successfully",
                "data": {
                    "id": account.id,
                    "platform": platform,
                    "account_name": account.account_name,
                    "account_handle": account.account_handle,
                }
            }
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts/connect-token")
async def connect_manual_token(payload: dict, tenant: TenantContext = Depends(get_current_tenant)):
    """Connect Facebook Pages using a manual Graph Explorer or Page access token."""
    tenant_id = payload.get("tenant_id", "")
    project_id = payload.get("project_id", "")
    platform = payload.get("platform", "meta")
    token = payload.get("token", "")

    if not tenant_id or not token:
        raise HTTPException(status_code=400, detail="tenant_id and token are required")

    import httpx
    try:
        async with async_session_maker() as session:
            pages_list = []
            if token.startswith("mock_"):
                pages_list = [
                    {
                        "id": "mock_insta_123" if platform == "instagram" else "mock_page_123",
                        "name": "Mock Instagram Business" if platform == "instagram" else "Mock Facebook Page",
                        "access_token": token,
                        "picture": ""
                    }
                ]
            else:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    # 1. Try /me/accounts (if it is a User Access Token)
                    try:
                        fields = "id,name,picture,access_token"
                        if platform == "instagram":
                            fields += ",instagram_business_account{id,username,name,profile_picture_url}"
                            
                        resp = await client.get(
                            "https://graph.facebook.com/v21.0/me/accounts",
                            params={"access_token": token, "fields": fields}
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            for p in data.get("data", []):
                                if platform == "instagram":
                                    insta_acc = p.get("instagram_business_account")
                                    if insta_acc:
                                        pages_list.append({
                                            "id": insta_acc.get("id"),
                                            "name": insta_acc.get("name") or insta_acc.get("username") or "Instagram Business",
                                            "access_token": p.get("access_token"),
                                            "picture": insta_acc.get("profile_picture_url") or p.get("picture", {}).get("data", {}).get("url", ""),
                                        })
                                else:
                                    pages_list.append({
                                        "id": p.get("id"),
                                        "name": p.get("name"),
                                        "access_token": p.get("access_token"),
                                        "picture": p.get("picture", {}).get("data", {}).get("url", ""),
                                    })
                    except Exception as pe:
                        logger.debug(f"Failed to fetch accounts via /me/accounts: {pe}")

                    # 2. If no pages found, try /me (in case it's a direct Page Access Token)
                    if not pages_list:
                        try:
                            resp = await client.get(
                                "https://graph.facebook.com/v21.0/me",
                                params={"access_token": token, "fields": "id,name,picture"}
                            )
                            if resp.status_code == 200:
                                p = resp.json()
                                pages_list.append({
                                    "id": p.get("id"),
                                    "name": p.get("name"),
                                    "access_token": token,
                                    "picture": p.get("picture", {}).get("data", {}).get("url", ""),
                                })
                        except Exception as me:
                            logger.error(f"Failed to fetch page info via /me: {me}")

            if not pages_list:
                raise HTTPException(
                    status_code=400,
                    detail="Could not retrieve any Facebook pages or accounts with the provided access token. Please make sure the token is valid and has appropriate permissions (pages_manage_posts, pages_read_engagement, pages_show_list)."
                )

            connected_accounts = []
            for page in pages_list:
                page_id = page["id"]
                page_name = page["name"]
                page_token = page["access_token"]
                page_pic = page["picture"]

                # Check if this page is already connected for this tenant
                result = await session.execute(
                    select(ConnectedSocialAccount).where(
                        ConnectedSocialAccount.tenant_id == tenant_id,
                        ConnectedSocialAccount.platform == platform,
                        ConnectedSocialAccount.platform_user_id == page_id
                    )
                )
                existing = result.scalars().first()

                if existing:
                    existing.account_name = page_name
                    existing.account_handle = page_name
                    existing.profile_image_url = page_pic
                    existing.access_token_enc = encrypt_token(page_token)
                    existing.is_active = True
                    existing.token_expires_at = datetime.now(timezone.utc) + timedelta(days=60)
                    connected_accounts.append(existing)
                else:
                    new_acc = ConnectedSocialAccount(
                        tenant_id=tenant_id,
                        project_id=project_id,
                        platform=platform,
                        platform_user_id=page_id,
                        account_name=page_name,
                        account_handle=page_name,
                        profile_image_url=page_pic,
                        access_token_enc=encrypt_token(page_token),
                        refresh_token_enc=None,
                        token_expires_at=datetime.now(timezone.utc) + timedelta(days=60),
                        scopes="pages_manage_posts,pages_read_engagement,pages_show_list",
                        is_active=True,
                    )
                    session.add(new_acc)
                    connected_accounts.append(new_acc)

            await session.commit()

            return {
                "success": True,
                "message": f"Connected {len(connected_accounts)} Facebook page(s) successfully using manual token!",
                "data": [
                    {
                        "id": acc.id,
                        "platform": platform,
                        "account_name": acc.account_name,
                        "account_handle": acc.account_handle,
                    }
                    for acc in connected_accounts
                ]
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual token connection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/accounts/{account_id}/refresh")
async def refresh_token(account_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Force refresh an account's access token."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ConnectedSocialAccount).where(ConnectedSocialAccount.id == account_id)
            )
            account = result.scalars().first()
            if not account:
                raise HTTPException(status_code=404, detail="Account not found")

            provider = get_provider(account.platform)
            if not provider:
                raise HTTPException(status_code=400, detail=f"No provider for {account.platform}")

            account_data = {
                "access_token": decrypt_token(account.access_token_enc) if account.access_token_enc else "",
                "refresh_token": decrypt_token(account.refresh_token_enc) if account.refresh_token_enc else "",
            }

            new_tokens = await provider.refresh_access_token(account_data)

            account.access_token_enc = encrypt_token(new_tokens.get("access_token", ""))
            if new_tokens.get("refresh_token"):
                account.refresh_token_enc = encrypt_token(new_tokens["refresh_token"])
            account.token_expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=new_tokens.get("expires_in", 3600)
            )
            await session.commit()

            return {"success": True, "message": "Token refreshed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/accounts/{account_id}")
async def disconnect_account(account_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Disconnect a social account."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(ConnectedSocialAccount).where(ConnectedSocialAccount.id == account_id)
            )
            account = result.scalars().first()
            if not account:
                raise HTTPException(status_code=404, detail="Account not found")

            await session.delete(account)
            await session.commit()

        return {"success": True, "message": "Account disconnected"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to disconnect account: {e}")
        raise HTTPException(status_code=500, detail=str(e))
