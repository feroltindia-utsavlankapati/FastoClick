from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from shared.database import async_session_maker
from shared.models.tenant import Project
from shared.dependencies import get_current_tenant, TenantContext
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    goals: Optional[str] = None
    target_audience: Optional[str] = None
    kpis: Optional[str] = None
    status: Optional[str] = "active"

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

async def get_db():
    async with async_session_maker() as session:
        yield session

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(Project).where(Project.tenant_id == tenant.id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    new_project = Project(
        tenant_id=tenant.id,
        name=project.name,
        description=project.description,
        goals=project.goals,
        target_audience=project.target_audience,
        kpis=project.kpis,
        status=project.status
    )
    db.add(new_project)
    await db.commit()
    await db.refresh(new_project)
    return new_project

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(Project).where(Project.id == project_id, Project.tenant_id == tenant.id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    return project

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(Project).where(Project.id == project_id, Project.tenant_id == tenant.id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    for key, value in project_update.dict().items():
        setattr(project, key, value)
        
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    stmt = select(Project).where(Project.id == project_id, Project.tenant_id == tenant.id)
    result = await db.execute(stmt)
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted successfully"}
