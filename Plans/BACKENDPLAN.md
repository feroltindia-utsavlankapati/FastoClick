# Backend Architecture Plan
## Agentic AI Digital Marketing OS

---

## 1. SERVICE ARCHITECTURE

### Microservice Breakdown

```
backend/
├── services/
│   ├── auth/                      Port: 8001
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── login.py
│   │   │   ├── oauth.py
│   │   │   └── tokens.py
│   │   └── models/
│   │
│   ├── tenant/                    Port: 8002
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── tenants.py
│   │   │   ├── users.py
│   │   │   └── plans.py
│   │   └── models/
│   │
│   ├── agent_orchestrator/        Port: 8003
│   │   ├── main.py
│   │   ├── registry.py
│   │   ├── orchestrator.py
│   │   ├── routes/
│   │   └── agents/
│   │       ├── base_agent.py
│   │       ├── strategy_agent.py
│   │       ├── seo_agent.py
│   │       ├── content_agent.py
│   │       ├── ads_agent.py
│   │       ├── research_agent.py
│   │       ├── analytics_agent.py
│   │       ├── cro_agent.py
│   │       ├── email_agent.py
│   │       ├── social_agent.py
│   │       └── automation_agent.py
│   │
│   ├── workflow_engine/           Port: 8004
│   │   ├── main.py
│   │   ├── temporal_client.py
│   │   ├── workflows/
│   │   │   ├── content_campaign.py
│   │   │   ├── seo_audit.py
│   │   │   ├── email_sequence.py
│   │   │   ├── ads_campaign.py
│   │   │   └── full_marketing_plan.py
│   │   └── activities/
│   │
│   ├── memory/                    Port: 8005
│   │   ├── main.py
│   │   ├── vector_store.py
│   │   ├── context_builder.py
│   │   └── routes/
│   │
│   ├── approval/                  Port: 8006
│   │   ├── main.py
│   │   ├── queue_manager.py
│   │   ├── notifier.py
│   │   └── routes/
│   │
│   ├── analytics/                 Port: 8007
│   │   ├── main.py
│   │   ├── kpi_tracker.py
│   │   ├── report_generator.py
│   │   └── routes/
│   │
│   ├── integration_hub/           Port: 8008
│   │   ├── main.py
│   │   ├── connectors/
│   │   │   ├── google_analytics.py
│   │   │   ├── google_ads.py
│   │   │   ├── meta_ads.py
│   │   │   ├── hubspot.py
│   │   │   ├── mailchimp.py
│   │   │   ├── semrush.py
│   │   │   └── wordpress.py
│   │   └── credential_vault.py
│   │
│   └── cgh/                       Port: 8009 (Confidentiality & Governance Handler)
│       ├── main.py
│       ├── auth_gateway.py
│       ├── policy_engine.py       # OPA integration
│       ├── secret_manager.py      # Vault integration
│       ├── anomaly_detector.py
│       ├── audit_logger.py
│       ├── ai_action_controller.py
│       └── trust_manager.py
│
├── shared/                        # Shared Python library
│   ├── models/
│   │   ├── tenant.py
│   │   ├── agent.py
│   │   ├── workflow.py
│   │   └── approval.py
│   ├── clients/
│   │   ├── cgh_client.py
│   │   ├── memory_client.py
│   │   └── event_client.py
│   └── utils/
│       ├── logging.py
│       └── validators.py
│
└── gateway/                       # API Gateway config (Kong/Traefik)
    ├── routes.yaml
    ├── plugins.yaml
    └── rate_limits.yaml
```

---

## 2. PYTHON PROJECT STANDARDS

### FastAPI App Factory Pattern

```python
# services/auth/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .routes import login, oauth, tokens
from shared.clients.cgh_client import CGHClient

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.cgh = await CGHClient.connect()
    app.state.db = await create_db_pool()
    yield
    # Shutdown
    await app.state.db.close()

def create_app() -> FastAPI:
    app = FastAPI(
        title="Auth Service",
        version="1.0.0",
        lifespan=lifespan
    )
    app.include_router(login.router, prefix="/auth")
    app.include_router(oauth.router, prefix="/auth/oauth")
    app.include_router(tokens.router, prefix="/auth/tokens")
    return app

app = create_app()
```

### Dependency Injection

```python
# shared/dependencies.py
from functools import lru_cache
from fastapi import Depends, Header, HTTPException
from .clients.cgh_client import CGHClient

async def get_current_tenant(
    x_tenant_id: str = Header(...),
    authorization: str = Header(...)
) -> TenantContext:
    token = authorization.replace("Bearer ", "")
    # CGH validates token + tenant combo
    ctx = await CGHClient.validate_request(token, x_tenant_id)
    if not ctx.valid:
        raise HTTPException(401, "Invalid credentials")
    return ctx.tenant

async def get_db(tenant: TenantContext = Depends(get_current_tenant)):
    async with get_db_session(tenant.id) as session:
        yield session
```

### Configuration Management

```python
# shared/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    
    # Redis
    REDIS_URL: str
    
    # AI
    LITELLM_API_KEY: str
    DEFAULT_MODEL: str = "gpt-4-turbo"
    MAX_TOKENS_PER_REQUEST: int = 4096
    
    # Services
    CGH_URL: str
    MEMORY_SERVICE_URL: str
    APPROVAL_SERVICE_URL: str
    
    # Vault
    VAULT_URL: str
    VAULT_TOKEN: str
    
    # Kafka
    KAFKA_BROKERS: str
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

## 3. AGENT SYSTEM DETAILS

### Base Agent Class

```python
# services/agent_orchestrator/agents/base_agent.py
from abc import ABC, abstractmethod
from langgraph.graph import StateGraph, END
from typing import Any, Dict
import structlog

log = structlog.get_logger()

class AgentState(TypedDict):
    tenant_id: str
    task: AgentTask
    context: AgentContext
    plan: List[str]
    tool_results: List[ToolResult]
    output: Optional[AgentOutput]
    confidence: float
    iteration: int
    needs_human_review: bool
    error: Optional[str]

class BaseMarketingAgent(ABC):
    MAX_ITERATIONS = 5
    
    def __init__(self, manifest: AgentManifest, tenant_id: str):
        self.manifest = manifest
        self.tenant_id = tenant_id
        self.memory = MemoryClient(tenant_id)
        self.governance = CGHClient()
        self.llm = LiteLLMClient(model=manifest.preferred_model)
        self.graph = self._build_graph()
    
    def _build_graph(self) -> CompiledGraph:
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
        
        checkpointer = PostgresSaver.from_conn_string(settings.DATABASE_URL)
        return g.compile(checkpointer=checkpointer)
    
    async def _load_context(self, state: AgentState) -> AgentState:
        log.info("agent.context.loading", agent=self.manifest.agent_id)
        context = await self.memory.build_context(state["task"])
        return {**state, "context": context}
    
    async def _execute(self, state: AgentState) -> AgentState:
        # Validate tool permissions with CGH
        for tool_name in self.get_required_tools(state["plan"]):
            allowed = await self.governance.check_tool_permission(
                agent_id=self.manifest.agent_id,
                tool_name=tool_name,
                tenant_id=self.tenant_id
            )
            if not allowed:
                raise PermissionError(f"Tool {tool_name} not permitted")
        
        results = await self._run_tools(state)
        return {**state, "tool_results": results}
    
    def _route_after_execute(self, state: AgentState) -> str:
        if state["iteration"] >= self.MAX_ITERATIONS:
            return "finalize"
        if self._needs_reflection(state):
            return "reflect"
        return "finalize"
    
    @abstractmethod
    async def _plan(self, state: AgentState) -> AgentState: ...
    
    @abstractmethod
    async def _reflect(self, state: AgentState) -> AgentState: ...
    
    @abstractmethod
    async def _finalize(self, state: AgentState) -> AgentState: ...
```

### Strategy Agent Example

```python
# services/agent_orchestrator/agents/strategy_agent.py
class StrategyAgent(BaseMarketingAgent):
    
    SYSTEM_PROMPT = """You are an expert digital marketing strategist.
    Analyze the provided business context and create data-driven,
    actionable marketing strategies tailored to the business goals.
    Always cite reasoning and provide confidence scores."""
    
    async def _plan(self, state: AgentState) -> AgentState:
        context_summary = state["context"].to_prompt_string()
        
        plan_response = await self.llm.complete(
            system=self.SYSTEM_PROMPT,
            user=f"""
            Business Context: {context_summary}
            Task: {state['task'].description}
            
            Create a step-by-step research and analysis plan to build
            a comprehensive marketing strategy. List 3-7 specific steps.
            """,
            response_format={"type": "json_object"}
        )
        
        plan = json.loads(plan_response)["steps"]
        return {**state, "plan": plan, "iteration": state["iteration"] + 1}
    
    async def _reflect(self, state: AgentState) -> AgentState:
        reflection = await self.llm.complete(
            system=self.SYSTEM_PROMPT,
            user=f"""
            Review this marketing strategy draft:
            {state['output']}
            
            Evaluate:
            1. Is it specific enough for this business?
            2. Are the tactics realistic and measurable?
            3. What's missing?
            4. Confidence score (0.0-1.0)?
            """,
            response_format={"type": "json_object"}
        )
        
        feedback = json.loads(reflection)
        confidence = feedback["confidence_score"]
        
        return {
            **state,
            "confidence": confidence,
            "needs_human_review": confidence < self.manifest.approval_threshold
        }
```

---

## 4. WORKFLOW ENGINE DETAILS

### Temporal Activity Examples

```python
# services/workflow_engine/activities/agent_activities.py
from temporalio import activity
from temporalio.exceptions import ApplicationError

@activity.defn
async def run_strategy_agent(params: AgentTaskParams) -> AgentResult:
    """Durable activity — Temporal retries on failure automatically"""
    try:
        agent = StrategyAgent(
            manifest=await get_agent_manifest("strategy_agent"),
            tenant_id=params.tenant_id
        )
        result = await agent.graph.ainvoke({
            "tenant_id": params.tenant_id,
            "task": params.task,
            "iteration": 0
        })
        return AgentResult(
            output=result["output"],
            confidence=result["confidence"],
            needs_approval=result["needs_human_review"]
        )
    except Exception as e:
        raise ApplicationError(str(e), non_retryable=isinstance(e, ValidationError))

@activity.defn
async def create_approval_request(params: ApprovalParams) -> str:
    """Create approval and return approval_id — workflow waits on this"""
    approval_id = await approval_service.create(
        tenant_id=params.tenant_id,
        content=params.content,
        agent_id=params.agent_id,
        confidence=params.confidence
    )
    # Workflow pauses here until signal received
    return approval_id
```

### Workflow with Approval Gate

```python
# services/workflow_engine/workflows/seo_audit_workflow.py
@workflow.defn
class SEOAuditWorkflow:
    def __init__(self):
        self._approval_signal = asyncio.Queue()
    
    @workflow.signal
    async def approval_received(self, decision: ApprovalDecision):
        await self._approval_signal.put(decision)
    
    @workflow.run
    async def run(self, params: SEOAuditParams) -> SEOAuditResult:
        
        # Run audit agents in parallel
        crawl_data, keyword_data, backlink_data = await asyncio.gather(
            workflow.execute_activity(crawl_site, params,
                start_to_close_timeout=timedelta(minutes=45),
                retry_policy=RetryPolicy(max_attempts=3)),
            workflow.execute_activity(research_keywords, params,
                start_to_close_timeout=timedelta(minutes=20)),
            workflow.execute_activity(analyze_backlinks, params,
                start_to_close_timeout=timedelta(minutes=15))
        )
        
        # Generate recommendations
        recommendations = await workflow.execute_activity(
            generate_seo_recommendations,
            SEOData(crawl=crawl_data, keywords=keyword_data, backlinks=backlink_data),
            start_to_close_timeout=timedelta(minutes=10)
        )
        
        # Gate: requires human approval before sending to client
        approval_id = await workflow.execute_activity(
            create_approval_request,
            ApprovalParams(content=recommendations, type="seo_audit"),
            start_to_close_timeout=timedelta(seconds=30)
        )
        
        # Wait up to 72 hours for human decision
        try:
            decision = await workflow.wait_condition(
                lambda: not self._approval_signal.empty(),
                timeout=timedelta(hours=72)
            )
            decision = await self._approval_signal.get()
        except asyncio.TimeoutError:
            await workflow.execute_activity(escalate_approval, approval_id)
            decision = await self._approval_signal.get()  # Wait for escalated approval
        
        if not decision.approved:
            # Revision requested — re-run with feedback
            recommendations = await workflow.execute_activity(
                revise_recommendations,
                RevisionParams(original=recommendations, feedback=decision.feedback)
            )
        
        return SEOAuditResult(
            recommendations=recommendations,
            approval_id=approval_id,
            approved_by=decision.reviewer_id
        )
```

---

## 5. API DESIGN STANDARDS

### Response Envelope

```python
# shared/schemas/responses.py
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional
from datetime import datetime
import uuid

T = TypeVar("T")

class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int

class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    pagination: Optional[PaginationMeta] = None
    request_id: str = str(uuid.uuid4())
    timestamp: datetime = datetime.utcnow()

# Usage in routes
@router.get("/agents", response_model=APIResponse[List[AgentManifest]])
async def list_agents(tenant: TenantContext = Depends(get_current_tenant)):
    agents = await agent_registry.list_for_tenant(tenant.id, tenant.plan)
    return APIResponse(success=True, data=agents)
```

### Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| AUTH_001 | 401 | Invalid or expired token |
| AUTH_002 | 403 | Insufficient permissions |
| TENANT_001 | 403 | Feature not in tenant plan |
| AGENT_001 | 404 | Agent not found in registry |
| AGENT_002 | 409 | Agent at max concurrent instances |
| AGENT_003 | 429 | Token budget exceeded |
| WORKFLOW_001 | 404 | Workflow not found |
| WORKFLOW_002 | 409 | Workflow already running |
| APPROVAL_001 | 404 | Approval request not found |
| GOVERNANCE_001 | 403 | CGH policy violation |

---

## 6. CELERY TASK DEFINITIONS

```python
# services/agent_orchestrator/tasks.py
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="agent_execution",
    acks_late=True  # Only acknowledge after completion
)
def execute_agent_task(self, agent_id: str, task_data: dict, tenant_id: str):
    """Celery task wrapper for agent execution"""
    try:
        # Long-running agents run via Temporal, short ones via Celery
        result = agent_runner.run_sync(agent_id, task_data, tenant_id)
        publish_result.delay(result)
        return result
    except RetryableError as e:
        logger.warning(f"Retrying agent task: {e}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
    except FatalError as e:
        logger.error(f"Fatal agent error: {e}")
        notify_failure.delay(agent_id, str(e), tenant_id)
        raise  # Don't retry

@shared_task(queue="notifications")
def send_approval_notification(approval_id: str, reviewer_id: str):
    """Notify reviewers of pending approvals"""
    notification_service.send(
        recipient_id=reviewer_id,
        template="approval_required",
        data={"approval_id": approval_id}
    )
```

---

## 7. TESTING ARCHITECTURE

```
tests/
├── unit/
│   ├── agents/
│   │   ├── test_strategy_agent.py   # Test agent logic with mocked LLM
│   │   ├── test_seo_agent.py
│   │   └── test_base_agent.py
│   ├── services/
│   │   ├── test_memory_service.py
│   │   └── test_approval_service.py
│   └── workflows/
│       └── test_workflow_definitions.py
│
├── integration/
│   ├── test_agent_end_to_end.py     # Real LLM calls (expensive, CI only)
│   ├── test_workflow_execution.py   # Temporal dev server
│   └── test_approval_flow.py
│
└── e2e/
    ├── test_full_campaign_workflow.py
    └── test_multi_agent_collaboration.py

# Test utilities
conftest.py
├── mock_llm()          # Returns deterministic LLM responses
├── mock_cgh()          # Governance client that always allows
├── test_tenant()       # Creates isolated test tenant
└── async_client()      # FastAPI TestClient for async routes
```

---

## 8. ENVIRONMENT CONFIGURATION

```bash
# .env.example

# === DATABASE ===
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/marketing_os
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# === CACHE ===
REDIS_URL=redis://localhost:6379/0
REDIS_SESSION_DB=1
REDIS_CACHE_DB=2

# === AI ===
LITELLM_MASTER_KEY=sk-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_MODEL=gpt-4-turbo-preview
FALLBACK_MODEL=claude-3-sonnet-20240229

# === MESSAGE BROKER ===
RABBITMQ_URL=amqp://user:pass@localhost:5672/
KAFKA_BROKERS=localhost:9092

# === VECTOR DB ===
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# === WORKFLOW ===
TEMPORAL_URL=localhost:7233
TEMPORAL_NAMESPACE=marketing-os

# === VAULT ===
VAULT_URL=http://localhost:8200
VAULT_ROLE_ID=
VAULT_SECRET_ID=

# === SERVICES ===
CGH_URL=http://cgh:8009
MEMORY_SERVICE_URL=http://memory:8005
APPROVAL_SERVICE_URL=http://approval:8006

# === ENVIRONMENT ===
ENVIRONMENT=development  # development | staging | production
LOG_LEVEL=INFO
LOG_FORMAT=json

# === SECURITY ===
JWT_SECRET_KEY=
JWT_ALGORITHM=RS256
JWT_EXPIRY_MINUTES=60
INTERNAL_SERVICE_TOKEN_EXPIRY_MINUTES=15
```

---

## 9. GOVERNANCE HANDLER (CGH) DEEP DIVE

### OPA Policy Examples

```rego
# cgh/policies/agent_tool_access.rego
package marketing.agent.tools

default allow = false

allow {
    valid_agent_token(input.agent_token)
    tenant_has_tool_access(input.tenant_id, input.tool_name)
    agent_within_budget(input.tenant_id, input.agent_id)
    not tool_blocked_for_agent(input.agent_id, input.tool_name)
}

tenant_has_tool_access(tenant_id, tool_name) {
    tenant := data.tenants[tenant_id]
    tool_name in tenant.allowed_tools
}

agent_within_budget(tenant_id, agent_id) {
    usage := data.usage[tenant_id].agents[agent_id]
    limits := data.limits[tenant_id]
    usage.tokens_today < limits.daily_token_budget
}

# Anomaly: agent using unexpected tool chain
suspicious_behavior {
    input.tool_sequence != data.expected_sequences[input.agent_id]
    count(input.tool_sequence) > 10
}
```

### Secret Manager Integration

```python
# cgh/secret_manager.py
import hvac  # HashiCorp Vault client

class SecretManager:
    def __init__(self):
        self.client = hvac.Client(url=settings.VAULT_URL)
        self.client.auth.approle.login(
            role_id=settings.VAULT_ROLE_ID,
            secret_id=settings.VAULT_SECRET_ID
        )
    
    async def get_integration_credential(
        self, tenant_id: str, integration: str
    ) -> dict:
        """Fetch credentials — never stored in env files"""
        secret = self.client.secrets.kv.v2.read_secret_version(
            path=f"marketing-os/tenants/{tenant_id}/integrations/{integration}"
        )
        return secret["data"]["data"]
    
    async def get_ai_api_key(self, provider: str) -> str:
        """Dynamic AI API key — rotated automatically"""
        secret = self.client.secrets.kv.v2.read_secret_version(
            path=f"marketing-os/ai-providers/{provider}"
        )
        return secret["data"]["data"]["api_key"]
    
    async def rotate_database_credentials(self, tenant_id: str):
        """Vault generates new DB credentials on demand"""
        creds = self.client.secrets.database.generate_credentials(
            name=f"tenant-{tenant_id}"
        )
        return creds["data"]
```

---

*Backend Plan v1.0 — See MASTER_PLAN.md for full system context*