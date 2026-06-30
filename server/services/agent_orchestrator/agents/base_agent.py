from abc import ABC, abstractmethod
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END
from pydantic import BaseModel
from shared.utils.memory_client import MemoryClient

class AgentTask(BaseModel):
    description: str
    data: dict = {}

class AgentContext(BaseModel):
    summary: str
    history: List[dict] = []
    
    def to_prompt_string(self) -> str:
        return self.summary

class AgentState(TypedDict):
    tenant_id: str
    project_id: Optional[str]
    task: AgentTask
    context: AgentContext
    plan: List[str]
    tool_results: dict
    output: Optional[str]
    confidence: float
    iteration: int
    needs_human_review: bool
    error: Optional[str]
    extra_data: dict

class BaseMarketingAgent(ABC):
    MAX_ITERATIONS = 10
    
    def __init__(self, manifest: Any, tenant_id: str):
        self.manifest = manifest
        self.tenant_id = tenant_id
        # Initialize dual memory module (Vector + Graph RAG)
        self.memory = MemoryClient(tenant_id)
        # self.llm = LiteLLMClient(...)
        self.graph = self._build_graph()
        
    def _build_graph(self):
        g = StateGraph(AgentState)
        
        g.add_node("load_context", self._load_context)
        g.add_node("plan", self._plan)
        g.add_node("execute", self._execute)
        g.add_node("reflect", self._reflect)
        g.add_node("finalize", self._finalize)
        
        g.set_entry_point("load_context")
        g.add_edge("load_context", "plan")
        g.add_edge("plan", "execute")
        g.add_conditional_edges("execute", self._route_after_execute)
        g.add_conditional_edges("reflect", self._route_after_reflect)
        g.add_edge("finalize", END)
        
        return g.compile()
        
    async def _load_context(self, state: AgentState) -> AgentState:
        # Load real context using the dual memory module
        task_desc = state["task"].description
        retrieved_context = await self.memory.retrieve_context(task_desc)
        
        summary = f"Task: {task_desc}\n\nHistorical Memory Context:\n{retrieved_context}"
        context = AgentContext(summary=summary)
        state["context"] = context
        return state
        
    async def _execute(self, state: AgentState) -> AgentState:
        # Mock execution logic
        state["tool_results"] = {"mock_tool": "success"}
        state["output"] = f"Draft output for {state['task'].description}"
        return state
        
    def _route_after_execute(self, state: AgentState) -> str:
        if state["iteration"] >= self.MAX_ITERATIONS:
            return "finalize"
        if self._needs_reflection(state):
            return "reflect"
        return "finalize"
        
    def _needs_reflection(self, state: AgentState) -> bool:
        return state["confidence"] < self.manifest.approval_confidence_threshold
        
    def _route_after_reflect(self, state: AgentState) -> str:
        if state["confidence"] >= self.manifest.approval_confidence_threshold or state["iteration"] >= self.MAX_ITERATIONS:
            return "finalize"
        return "plan"
        
    @abstractmethod
    async def _plan(self, state: AgentState) -> AgentState:
        pass
        
    @abstractmethod
    async def _reflect(self, state: AgentState) -> AgentState:
        pass
        
    @abstractmethod
    async def _finalize(self, state: AgentState) -> AgentState:
        pass
