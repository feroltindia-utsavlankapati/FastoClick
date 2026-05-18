from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.future import select
from sqlalchemy import delete
from shared.database import async_session_maker
from shared.models.tenant import ContentIdeasResult
from shared.dependencies import get_current_tenant, TenantContext
import json

router = APIRouter()


@router.get("/content-ideas")
async def list_content_ideas(tenant: TenantContext = Depends(get_current_tenant)):
    """Return all content idea results for the authenticated tenant, newest first."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(ContentIdeasResult)
            .where(ContentIdeasResult.tenant_id == tenant.id)
            .order_by(ContentIdeasResult.created_at.desc())
        )
        records = result.scalars().all()

    return {
        "success": True,
        "data": [
            {
                "id":         r.id,
                "plan_id":    r.plan_id,
                "plan_name":  r.plan_name,
                "industry":   r.industry,
                "result":     json.loads(r.result_json),
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in records
        ]
    }


@router.get("/content-ideas/{result_id}")
async def get_content_ideas(result_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Get a single content ideas result by ID."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(ContentIdeasResult).where(
                ContentIdeasResult.id == result_id,
                ContentIdeasResult.tenant_id == tenant.id
            )
        )
        record = result.scalars().first()

    if not record:
        raise HTTPException(status_code=404, detail="Content ideas result not found.")

    return {
        "success": True,
        "data": {
            "id":         record.id,
            "plan_id":    record.plan_id,
            "plan_name":  record.plan_name,
            "industry":   record.industry,
            "result":     json.loads(record.result_json),
            "created_at": record.created_at.isoformat() if record.created_at else None
        }
    }


@router.delete("/content-ideas/{result_id}")
async def delete_content_ideas(result_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Permanently delete a content ideas result."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(ContentIdeasResult).where(
                ContentIdeasResult.id == result_id,
                ContentIdeasResult.tenant_id == tenant.id
            )
        )
        record = result.scalars().first()

        if not record:
            raise HTTPException(status_code=404, detail="Content ideas result not found.")

        await session.execute(
            delete(ContentIdeasResult).where(ContentIdeasResult.id == result_id)
        )
        await session.commit()

    return {"success": True, "message": f"Content ideas result {result_id} deleted."}
