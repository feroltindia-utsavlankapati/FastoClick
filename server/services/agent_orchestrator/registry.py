from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import importlib
import inspect
import os

class AgentManifest(BaseModel):
    agent_id: str
    name: str
    version: str
    description: str = ""
    capabilities: List[str] = []
    tools_required: List[str] = []
    max_concurrent_instances: int = 20
    default_timeout_seconds: int = 300
    human_approval_required: bool = True
    approval_confidence_threshold: float = 0.85
    tenant_plan_required: str = "starter"

class AgentRegistry:
    def __init__(self):
        self._agents: Dict[str, dict] = {}
        
    async def auto_discover_and_register(self, agents_dir: str):
        """Discovers agents in the agents_dir and registers them."""
        if not os.path.exists(agents_dir):
            return
            
        for filename in os.listdir(agents_dir):
            if filename.endswith(".py") and not filename.startswith("__"):
                module_name = f"services.agent_orchestrator.agents.{filename[:-3]}"
                try:
                    module = importlib.import_module(module_name)
                    # Look for MANIFEST in the module
                    if hasattr(module, "MANIFEST"):
                        manifest = getattr(module, "MANIFEST")
                        # Look for AgentClass
                        agent_class = None
                        for name, obj in inspect.getmembers(module, inspect.isclass):
                            if name.endswith("Agent") and name != "BaseMarketingAgent":
                                agent_class = obj
                                break
                        
                        if manifest and agent_class:
                            self.register(manifest, agent_class)
                except Exception as e:
                    print(f"Failed to load agent from {filename}: {e}")
                    import traceback
                    with open("lifespan_debug.txt", "a") as f:
                        f.write(f"Failed to load {filename}: {e}\n{traceback.format_exc()}\n")
                    
    def register(self, manifest: AgentManifest, agent_class: Any):
        self._agents[manifest.agent_id] = {
            "manifest": manifest,
            "agent_class": agent_class
        }
        print(f"Registered agent: {manifest.agent_id}")

    def get_agent(self, agent_id: str) -> Optional[dict]:
        return self._agents.get(agent_id)

    def list_agents(self) -> List[AgentManifest]:
        return [data["manifest"] for data in self._agents.values()]

agent_registry = AgentRegistry()
