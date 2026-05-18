from temporalio import activity
import httpx
from shared.config import get_settings

settings = get_settings()

@activity.defn
async def run_strategy_agent(params: dict) -> dict:
    """Mock durable activity that runs the strategy agent via the API Gateway."""
    # Assuming API Gateway is at 8000
    tenant_id = params.get("tenant_id", "default")
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        # In a real app we'd proxy this correctly or use a shared message queue
        # Here we mock calling the agent orchestrator directly on 8003
        try:
            response = await client.post(
                "http://127.0.0.1:8003/agent/agents/strategy_agent/execute",
                json={"description": params.get("description", "Start planning")},
                headers={
                    "X-Tenant-ID": tenant_id,
                    "X-Internal-Token": settings.INTERNAL_SERVICE_TOKEN
                }
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            # Re-raise to let Temporal handle retries
            raise RuntimeError(f"Agent execution failed: {str(e)}")
