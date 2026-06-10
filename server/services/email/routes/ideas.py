from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.database import async_session_maker
from shared.models.email import EmailIdea
from shared.dependencies import get_current_tenant, TenantContext
from ..schemas import EmailIdeaCreate, EmailIdeaResponse
from typing import List

router = APIRouter()

async def get_db():
    async with async_session_maker() as session:
        yield session

@router.get("/project/{project_id}", response_model=List[EmailIdeaResponse])
async def list_ideas(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(EmailIdea).where(EmailIdea.project_id == project_id, EmailIdea.tenant_id == tenant.id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=EmailIdeaResponse)
async def create_idea(
    idea: EmailIdeaCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    new_idea = EmailIdea(
        tenant_id=tenant.id,
        project_id=idea.project_id,
        concept=idea.concept,
        status=idea.status
    )
    db.add(new_idea)
    await db.commit()
    await db.refresh(new_idea)
    return new_idea

@router.put("/{idea_id}", response_model=EmailIdeaResponse)
async def update_idea(
    idea_id: str,
    idea_update: EmailIdeaCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(EmailIdea).where(EmailIdea.id == idea_id, EmailIdea.tenant_id == tenant.id)
    result = await db.execute(stmt)
    idea = result.scalar_one_or_none()
    
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
        
    idea.concept = idea_update.concept
    idea.status = idea_update.status
    idea.project_id = idea_update.project_id
    
    await db.commit()
    await db.refresh(idea)
    return idea

@router.delete("/{idea_id}")
async def delete_idea(
    idea_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(EmailIdea).where(EmailIdea.id == idea_id, EmailIdea.tenant_id == tenant.id)
    result = await db.execute(stmt)
    idea = result.scalar_one_or_none()
    
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
        
    await db.delete(idea)
    await db.commit()
    return {"message": "Idea deleted successfully"}
