# Agent System Design
## Agentic AI Digital Marketing OS

---

## AGENT REGISTRY

All agents self-register on service startup. The registry is stored in PostgreSQL and cached in Redis.

```python
AGENT_REGISTRY = {
    "strategy_agent": AgentManifest(
        agent_id="strategy_agent",
        name="Marketing Strategy Agent",
        version="1.0.0",
        description="Generates comprehensive, data-driven marketing strategies",
        capabilities=["strategy_generation", "goal_setting", "channel_planning", "budget_allocation"],
        tools_required=["web_search", "competitor_lookup", "market_data_api"],
        input_schema=StrategyInput.schema(),
        output_schema=MarketingStrategy.schema(),
        max_concurrent_instances=20,
        default_timeout_seconds=300,
        human_approval_required=True,
        approval_confidence_threshold=0.85,
        memory_namespaces=["business_profile", "campaign_history", "competitor_intel"],
        tenant_plan_required="starter"
    ),
    
    "seo_agent": AgentManifest(
        agent_id="seo_agent",
        name="SEO Intelligence Agent",
        version="2.0.0",
        capabilities=["keyword_research", "on_page_audit", "technical_seo", "content_gap_analysis"],
        tools_required=["serper_api", "semrush_api", "pagespeed_api", "screaming_frog"],
        human_approval_required=True,
        approval_confidence_threshold=0.80,
        tenant_plan_required="starter"
    ),
    
    "content_agent": AgentManifest(
        agent_id="content_agent",
        name="Content Creation Agent",
        version="1.5.0",
        capabilities=["blog_writing", "social_copy", "email_copy", "ad_copy", "product_descriptions"],
        tools_required=["web_search", "image_search", "brand_guidelines_lookup"],
        human_approval_required=True,
        approval_confidence_threshold=0.75,
        tenant_plan_required="starter"
    ),
    
    "ads_agent": AgentManifest(
        agent_id="ads_agent",
        name="Paid Advertising Agent",
        version="1.0.0",
        capabilities=["campaign_planning", "audience_targeting", "bid_optimization", "creative_recommendations"],
        tools_required=["google_ads_api", "meta_ads_api", "audience_insights_api"],
        human_approval_required=True,
        approval_confidence_threshold=0.90,  # High threshold — real money involved
        tenant_plan_required="pro"
    ),
    
    "analytics_agent": AgentManifest(
        agent_id="analytics_agent",
        name="Performance Analytics Agent",
        version="1.0.0",
        capabilities=["performance_analysis", "trend_detection", "anomaly_detection", "report_generation"],
        tools_required=["google_analytics_api", "search_console_api", "data_warehouse_query"],
        human_approval_required=False,  # Read-only; no approval needed
        approval_confidence_threshold=0.95,
        tenant_plan_required="starter"
    ),
    
    "research_agent": AgentManifest(
        agent_id="research_agent",
        name="Market Research Agent",
        version="1.0.0",
        capabilities=["competitor_analysis", "market_trends", "audience_research", "industry_benchmarks"],
        tools_required=["web_search", "news_api", "social_listening_api"],
        human_approval_required=False,
        approval_confidence_threshold=0.85,
        tenant_plan_required="starter"
    ),
    
    "email_agent": AgentManifest(
        agent_id="email_agent",
        name="Email Marketing Agent",
        version="1.0.0",
        capabilities=["sequence_creation", "subject_line_optimization", "segmentation", "automation_design"],
        tools_required=["mailchimp_api", "sendgrid_api", "email_analytics_api"],
        human_approval_required=True,
        approval_confidence_threshold=0.80,
        tenant_plan_required="pro"
    ),
    
    "social_agent": AgentManifest(
        agent_id="social_agent",
        name="Social Media Agent",
        version="1.0.0",
        capabilities=["content_calendar", "post_scheduling", "engagement_analysis", "hashtag_research"],
        tools_required=["buffer_api", "twitter_api", "linkedin_api", "instagram_api"],
        human_approval_required=True,
        approval_confidence_threshold=0.80,
        tenant_plan_required="starter"
    ),
    
    "cro_agent": AgentManifest(
        agent_id="cro_agent",
        name="Conversion Rate Optimization Agent",
        version="1.0.0",
        capabilities=["landing_page_analysis", "ab_test_design", "funnel_analysis", "ux_recommendations"],
        tools_required=["hotjar_api", "google_optimize_api", "pagespeed_api"],
        human_approval_required=True,
        approval_confidence_threshold=0.85,
        tenant_plan_required="pro"
    ),
    
    "automation_agent": AgentManifest(
        agent_id="automation_agent",
        name="Marketing Automation Agent",
        version="1.0.0",
        capabilities=["workflow_design", "trigger_setup", "lead_scoring", "nurture_sequence"],
        tools_required=["hubspot_api", "zapier_api", "crm_api"],
        human_approval_required=True,
        approval_confidence_threshold=0.90,
        tenant_plan_required="enterprise"
    )
}
```

---

## MULTI-AGENT COLLABORATION PATTERNS

### Pattern 1: Sequential Pipeline

```
Research Agent → Strategy Agent → Content Agent → Approval → Publish
```

Each agent receives the output of the previous as part of its context.

### Pattern 2: Parallel Research → Synthesis

```
                    ┌→ SEO Agent ─────────────┐
                    ├→ Research Agent ─────────┤
                    ├→ Analytics Agent ────────┤→ Strategy Agent → Output
                    └→ CRO Agent ─────────────┘
```

Run independent agents in parallel, then synthesize results.

### Pattern 3: Orchestrator + Specialists

```python
class CampaignOrchestratorAgent(BaseMarketingAgent):
    """
    Master agent that coordinates all other agents for a full campaign.
    Does not generate content itself — delegates to specialists.
    """
    
    async def _plan(self, state: AgentState) -> AgentState:
        # Orchestrator decides which agents to call and in what order
        orchestration_plan = await self.llm.complete(
            user=f"""
            Campaign goal: {state['task'].description}
            Available agents: {list(AGENT_REGISTRY.keys())}
            Business context: {state['context'].summary}
            
            Design an agent orchestration plan. Specify:
            1. Which agents to run
            2. In what order (sequential vs parallel)
            3. What inputs each agent receives
            4. How outputs combine
            
            Format as JSON orchestration plan.
            """
        )
        return {**state, "plan": json.loads(orchestration_plan)["steps"]}
    
    async def _execute(self, state: AgentState) -> AgentState:
        results = {}
        
        for step in state["plan"]:
            if step["parallel"]:
                # Run parallel agents simultaneously
                parallel_results = await asyncio.gather(*[
                    self._spawn_sub_agent(agent_id, step["inputs"], state)
                    for agent_id in step["agents"]
                ])
                results.update(zip(step["agents"], parallel_results))
            else:
                # Run sequentially, feeding results forward
                for agent_id in step["agents"]:
                    inputs = self._resolve_inputs(step["inputs"], results)
                    result = await self._spawn_sub_agent(agent_id, inputs, state)
                    results[agent_id] = result
        
        return {**state, "tool_results": results}
    
    async def _spawn_sub_agent(
        self, agent_id: str, inputs: dict, state: AgentState
    ) -> AgentOutput:
        """Spawn a sub-agent with proper context and permissions"""
        # Validate with CGH that orchestrator can spawn this agent
        await self.governance.validate_agent_spawn(
            parent_agent=self.manifest.agent_id,
            child_agent=agent_id,
            tenant_id=self.tenant_id
        )
        
        AgentClass = AGENT_REGISTRY[agent_id].agent_class
        agent = AgentClass(
            manifest=AGENT_REGISTRY[agent_id],
            tenant_id=self.tenant_id
        )
        
        return await agent.graph.ainvoke({
            "tenant_id": self.tenant_id,
            "task": AgentTask(description=inputs["description"], data=inputs),
            "context": state["context"],  # Shared context
            "iteration": 0
        })
```

---

## ADDING NEW AGENTS

Step-by-step process to add a new agent without changing orchestration code:

### Step 1: Create Agent File

```python
# services/agent_orchestrator/agents/pr_agent.py
class PRAgent(BaseMarketingAgent):
    """PR & Communications Agent"""
    
    async def _plan(self, state: AgentState) -> AgentState:
        # Implementation
        ...
    
    async def _reflect(self, state: AgentState) -> AgentState:
        # Self-critique and improvement
        ...
    
    async def _finalize(self, state: AgentState) -> AgentState:
        # Package output with confidence score
        ...
```

### Step 2: Define Manifest

```python
# services/agent_orchestrator/agents/pr_agent.py (continued)
PR_AGENT_MANIFEST = AgentManifest(
    agent_id="pr_agent",
    name="PR & Communications Agent",
    version="1.0.0",
    capabilities=["press_release", "media_pitching", "crisis_comms", "thought_leadership"],
    tools_required=["web_search", "news_api"],
    human_approval_required=True,
    approval_confidence_threshold=0.85,
    tenant_plan_required="pro"
)
```

### Step 3: Auto-Registration

```python
# services/agent_orchestrator/main.py
# On startup, all agents in the agents/ directory register automatically
@asynccontextmanager
async def lifespan(app: FastAPI):
    await agent_registry.auto_discover_and_register(
        agents_dir="./agents",
        db=app.state.db
    )
    yield
```

### Step 4: CGH Policy Auto-Update

CGH reads the agent manifest and automatically creates OPA policies for the new agent's tool access and permissions. No manual policy writing required for standard agents.

### Step 5: Deploy

The new agent is available immediately. Existing workflows can reference it by `agent_id`. No downtime, no breaking changes.

---

## AGENT TOOL DEFINITIONS

```python
# shared/tools/tool_registry.py
TOOL_REGISTRY = {
    "web_search": ToolConfig(
        tool_id="web_search",
        provider="serper",
        rate_limit=100,  # per minute per tenant
        cost_per_call=0.001,
        timeout_seconds=10,
        requires_plan="starter"
    ),
    "semrush_api": ToolConfig(
        tool_id="semrush_api",
        provider="semrush",
        rate_limit=10,
        cost_per_call=0.01,
        timeout_seconds=30,
        requires_plan="pro"
    ),
    "google_ads_api": ToolConfig(
        tool_id="google_ads_api",
        provider="google",
        rate_limit=50,
        cost_per_call=0.0,
        timeout_seconds=20,
        requires_plan="pro",
        requires_oauth=True  # Tenant must connect their Google account
    )
}

class ToolCaller:
    """CGH-validated tool invocation"""
    
    async def call(self, tool_id: str, params: dict, agent_id: str, tenant_id: str) -> ToolResult:
        # 1. CGH permission check
        allowed = await self.governance.check_tool_permission(
            tool_id=tool_id,
            agent_id=agent_id,
            tenant_id=tenant_id
        )
        if not allowed:
            raise PermissionError(f"Tool {tool_id} denied by governance policy")
        
        # 2. Rate limit check
        await self.rate_limiter.check(tool_id, tenant_id)
        
        # 3. Execute tool
        tool_config = TOOL_REGISTRY[tool_id]
        result = await self._execute_tool(tool_config, params)
        
        # 4. Log to audit trail
        await self.audit.log_tool_call(
            tool_id=tool_id,
            agent_id=agent_id,
            tenant_id=tenant_id,
            params_hash=hash_params(params),
            result_hash=hash_result(result)
        )
        
        return result
```

---

*Agent System Design v1.0 — Part of Agentic AI Digital Marketing OS*