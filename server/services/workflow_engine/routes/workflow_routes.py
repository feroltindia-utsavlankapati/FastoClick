"""
In-process workflow runner — no Temporal required.
Stores jobs in memory, executes them as background asyncio tasks.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import uuid
import asyncio
from datetime import datetime, timedelta
import httpx
from sqlalchemy.future import select
from shared.config import get_settings
from shared.database import async_session_maker
from shared.dependencies import get_current_tenant, TenantContext
from shared.models.tenant import User
from shared.utils.security import create_access_token

settings = get_settings()
router = APIRouter()

# ─── In-memory job store ──────────────────────────────────────────────────────
_jobs: dict[str, dict] = {}


async def _get_service_token_for_tenant(tenant_id: str) -> Optional[str]:
    """Mint a short-lived JWT for the first active user of a tenant."""
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(User).where(User.tenant_id == tenant_id, User.is_active == True)
            )
            user = result.scalars().first()
        if not user:
            return None
        token = create_access_token(
            data={"sub": user.id, "tenant_id": tenant_id},
            expires_delta=timedelta(minutes=30)
        )
        return token
    except Exception as e:
        print(f"[WORKFLOW] ⚠ Could not mint service token: {e}")
        return None


# ─── Background execution logic ───────────────────────────────────────────────
async def _run_workflow(workflow_id: str, workflow_name: str, params: dict, tenant_id: str):
    """Runs the workflow steps in an asyncio background task."""
    print(f"\n[WORKFLOW] ▶ Starting {workflow_name} | id={workflow_id} | tenant={tenant_id}")
    _jobs[workflow_id]["status"] = "RUNNING"

    try:
        if workflow_name in ("SEOAuditWorkflow", "StrategyWorkflow"):
            description = params.get("description", "Run marketing strategy audit")

            # Mint a service JWT so the agent route can authenticate us
            print(f"[WORKFLOW]   Minting service token for tenant {tenant_id}")
            service_token = await _get_service_token_for_tenant(tenant_id)
            if not service_token:
                raise RuntimeError(f"No active user found for tenant {tenant_id} — cannot authenticate agent call.")

            print(f"[WORKFLOW]   Step 1 — Calling Strategy Agent")
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(
                    "http://127.0.0.1:8003/agent/agents/strategy_agent/execute",
                    json={"description": description},
                    headers={
                        "Authorization":   f"Bearer {service_token}",
                        "X-Internal-Token": settings.INTERNAL_SERVICE_TOKEN,
                        "Content-Type":    "application/json",
                    }
                )
                response.raise_for_status()
                result = response.json()

            print(f"[WORKFLOW]   ✅ Agent completed. Confidence: {result.get('data', {}).get('confidence', 0)}")
            _jobs[workflow_id]["result"]      = result
            _jobs[workflow_id]["status"]      = "COMPLETED"
            _jobs[workflow_id]["finished_at"] = datetime.utcnow().isoformat()
        else:
            raise ValueError(f"Unknown workflow: {workflow_name}")

    except Exception as e:
        print(f"[WORKFLOW]   ❌ Failed: {e}")
        _jobs[workflow_id]["status"]      = "FAILED"
        _jobs[workflow_id]["error"]       = str(e)
        _jobs[workflow_id]["finished_at"] = datetime.utcnow().isoformat()

    print(f"[WORKFLOW] ■ {workflow_name} finished → {_jobs[workflow_id]['status']}")


# ─── Routes ───────────────────────────────────────────────────────────────────
class StartWorkflowRequest(BaseModel):
    workflow_name: str
    params: dict = {}


@router.post("/start")
async def start_workflow(
    data: StartWorkflowRequest,
    background_tasks: BackgroundTasks,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Start a workflow as a background asyncio task. No Temporal required."""
    workflow_id = str(uuid.uuid4())
    tenant_id   = tenant.id

    _jobs[workflow_id] = {
        "workflow_id":  workflow_id,
        "workflow_name": data.workflow_name,
        "tenant_id":    tenant_id,
        "status":       "QUEUED",
        "result":       None,
        "error":        None,
        "started_at":   datetime.utcnow().isoformat(),
        "finished_at":  None
    }

    # Schedule as background task (non-blocking)
    background_tasks.add_task(
        _run_workflow, workflow_id, data.workflow_name, data.params, tenant_id
    )

    print(f"[WORKFLOW] ✅ Queued {data.workflow_name} | id={workflow_id}")
    return {
        "success":     True,
        "workflow_id": workflow_id,
        "status":      "QUEUED"
    }


@router.get("/status/{workflow_id}")
async def get_workflow_status(
    workflow_id: str,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Poll the status of a running workflow."""
    job = _jobs.get(workflow_id)
    if not job:
        raise HTTPException(status_code=404, detail="Workflow not found.")

    if job["tenant_id"] != tenant.id:
        raise HTTPException(status_code=403, detail="Access denied.")

    return {"success": True, **job}


@router.get("/list")
async def list_workflows(tenant: TenantContext = Depends(get_current_tenant)):
    """List all workflows for the authenticated tenant."""
    tenant_id = tenant.id
    jobs = [j for j in _jobs.values() if j["tenant_id"] == tenant_id]
    jobs.sort(key=lambda x: x["started_at"], reverse=True)
    return {"success": True, "data": jobs}
