from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from shared.database import async_session_maker
from shared.models.email import EmailTemplate
from shared.dependencies import get_current_tenant, TenantContext
from ..schemas import EmailTemplateCreate, EmailTemplateResponse
from typing import List

router = APIRouter()

async def get_db():
    async with async_session_maker() as session:
        yield session

@router.get("/", response_model=List[EmailTemplateResponse])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    stmt = select(EmailTemplate).where(EmailTemplate.tenant_id == tenant_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=EmailTemplateResponse)
async def create_template(
    template: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    new_template = EmailTemplate(
        tenant_id=tenant_id,
        name=template.name,
        subject=template.subject,
        body_html=template.body_html,
        body_text=template.body_text
    )
    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)
    return new_template

@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    stmt = delete(EmailTemplate).where(EmailTemplate.id == template_id, EmailTemplate.tenant_id == tenant_id)
    await db.execute(stmt)
    await db.commit()
    return {"message": "Template deleted"}
