from fastapi import APIRouter, Depends, HTTPException, Header, Request
from typing import List, Any, Optional
from ..registry import agent_registry, AgentManifest
from shared.dependencies import get_current_tenant, TenantContext

router = APIRouter()

@router.get("/agents", response_model=List[AgentManifest])
async def list_agents():
    """List all registered agents."""
    return agent_registry.list_agents()

@router.post("/agents/{agent_id}/execute")
async def execute_agent(
    agent_id: str,
    task_data: dict,
    project_id: Optional[str] = None,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Execute a specific agent with the authenticated tenant's context."""
    agent_info = agent_registry.get_agent(agent_id)
    if not agent_info:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    agent_class = agent_info["agent_class"]
    tenant_id = tenant.id  # Real tenant ID from JWT
    agent = agent_class(manifest=agent_info["manifest"], tenant_id=tenant_id)
    
    try:
        from services.agent_orchestrator.agents.base_agent import AgentTask, AgentContext
        initial_state = {
            "tenant_id":         tenant_id,
            "project_id":        project_id,
            "task":              AgentTask(description=task_data.get("description", "Default task"), data=task_data),
            "context":           AgentContext(summary=""),
            "plan":              [],
            "tool_results":      {},
            "output":            None,
            "confidence":        0.0,
            "iteration":         0,
            "needs_human_review": False,
            "error":             None,
            "extra_data":        {},
        }
        
        result = await agent.graph.ainvoke(initial_state)
        return {
            "success": True,
            "data": {
                "plan": result.get("output"),
                "confidence": result.get("confidence"),
                "iterations": result.get("iteration", 0)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
