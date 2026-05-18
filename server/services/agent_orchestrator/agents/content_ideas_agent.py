import json
import logging
import traceback
from datetime import datetime
from sqlalchemy.future import select

from shared.database import async_session_maker
from shared.models.tenant import StrategyPlan, ContentIdeasResult

from .base_agent import BaseMarketingAgent, AgentState
from ..registry import AgentManifest
from shared.utils.ai_integration import AIClient

logger = logging.getLogger(__name__)

MANIFEST = AgentManifest(
    agent_id="content_ideas_agent",
    name="Content Ideas Generator Agent",
    version="1.0.0",
    description=(
        "Analyzes a selected marketing strategy plan and generates structured, "
        "creative content ideas including formats, platforms, tone, captions, and priority levels."
    ),
    capabilities=[
        "plan_analysis",
        "content_ideation",
        "platform_mapping",
        "format_suggestion",
        "tone_definition",
        "caption_generation",
        "priority_scoring"
    ],
    tools_required=[],
    tenant_plan_required="starter"
)

SYSTEM_PROMPT = """
You are an elite AI Content Strategist and Creative Director.
You will receive a specific sub-task to generate content ideas for a marketing strategy plan.
Generate ONLY valid JSON. Do NOT include markdown formatting like ```json.
Ensure your response exactly matches the requested JSON structure.
"""

# ─────────────────────────────────────────────────────────────
# Console helpers
# ─────────────────────────────────────────────────────────────
def _banner(title: str):
    bar = "─" * 60
    print(f"\n{bar}\n  🎨 {title}\n{bar}")

def _step(label: str, value=None):
    print(f"  ▶ {label}")
    if value is not None:
        if isinstance(value, (dict, list)):
            print(json.dumps(value, indent=4, ensure_ascii=False))
        else:
            print(f"    {value}")

def _ok(label: str, value=None):
    print(f"  ✅ {label}")
    if value is not None:
        print(f"    {value}")

def _err(label: str, error=None):
    print(f"  ❌ {label}")
    if error:
        print(f"    ERROR: {error}")


class ContentIdeasAgent(BaseMarketingAgent):

    # ─────────────────────────────────────────────────────────────
    # STEP 1: PLAN
    # ─────────────────────────────────────────────────────────────
    async def _plan(self, state: AgentState) -> AgentState:
        task = state["task"]

        if "extra_data" not in state or not state.get("extra_data"):
            _banner("CONTENT IDEAS AGENT — INITIALIZING")

            plan_id = task.data.get("plan_id", "")
            _step("Plan ID to analyze", plan_id)
            _step("Tenant ID", state["tenant_id"])

            state["extra_data"] = {
                "plan_id":     plan_id,
                "source_plan": None,        # populated in fetch_plan step
                "content_output": {
                    "plan_name":          "",
                    "overview":           "",
                    "target_audience":    "",
                    "content_categories": [],
                    "content_ideas":      [],
                    "tone_style":         {},
                },
                "current_task": ""
            }

            state["plan"] = [
                "fetch_plan",
                "content_categories",
                "content_ideas",
                "tone_and_style",
            ]
            _ok("Task queue initialized", state["plan"])

        if state.get("plan"):
            next_task = state["plan"].pop(0)
            state["extra_data"]["current_task"] = next_task
            remaining = state.get("plan", [])
            _banner(f"PLAN — Next Sub-Task: '{next_task.upper()}'")
            _step("Remaining queue", remaining if remaining else "(last task)")

        return state

    # ─────────────────────────────────────────────────────────────
    # STEP 2: EXECUTE
    # ─────────────────────────────────────────────────────────────
    async def _execute(self, state: AgentState) -> AgentState:
        current_task = state["extra_data"].get("current_task")
        tenant_id    = state["tenant_id"]
        plan_id      = state["extra_data"].get("plan_id")
        iteration    = state.get("iteration", 0) + 1

        _banner(f"EXECUTE [{iteration}] — Sub-Task: '{current_task.upper()}'")

        # ── FETCH PLAN: pull from DB ──────────────────────────────
        if current_task == "fetch_plan":
            _step("Fetching strategy plan from DB", plan_id)
            try:
                async with async_session_maker() as session:
                    result = await session.execute(
                        select(StrategyPlan).where(
                            StrategyPlan.id == plan_id,
                            StrategyPlan.tenant_id == tenant_id
                        )
                    )
                    db_plan = result.scalars().first()

                if not db_plan:
                    raise ValueError(f"Plan {plan_id} not found for tenant {tenant_id}")

                plan_data = json.loads(db_plan.plan_json)
                state["extra_data"]["source_plan"] = plan_data
                state["extra_data"]["content_output"]["plan_name"]       = plan_data.get("company_name", "Unknown")
                state["extra_data"]["content_output"]["target_audience"] = plan_data.get("target_audience", "General Audience")
                state["extra_data"]["content_output"]["overview"]        = (
                    plan_data.get("strategy", {}).get("marketing_goal", "")
                    or plan_data.get("strategy", {}).get("business_goal", "")
                )

                _ok("Plan loaded from DB", {
                    "company": plan_data.get("company_name"),
                    "industry": plan_data.get("industry"),
                    "phases":   len(plan_data.get("campaign_plans", {}).get("phases", [])),
                    "channels": len(plan_data.get("campaign_plans", {}).get("channels", [])),
                })
                logger.info(f"Loaded plan {plan_id} for content ideas generation")

            except Exception as e:
                _err("Failed to fetch plan from DB", e)
                print(traceback.format_exc())
                logger.error(f"ContentIdeasAgent: fetch_plan failed: {e}")
                # Abort remaining tasks
                state["plan"] = []

            state["iteration"] = iteration
            state["confidence"] = 0.0
            return state

        # ── LLM TASKS ─────────────────────────────────────────────
        source_plan = state["extra_data"].get("source_plan") or {}
        plan_summary = json.dumps({
            "company":         source_plan.get("company_name", ""),
            "industry":        source_plan.get("industry", ""),
            "target_audience": source_plan.get("target_audience", ""),
            "strategy":        source_plan.get("strategy", {}),
            "channels":        source_plan.get("campaign_plans", {}).get("channels", []),
            "phases":          source_plan.get("campaign_plans", {}).get("phases", []),
        }, ensure_ascii=False)

        prompt = ""

        if current_task == "content_categories":
            prompt = f"""
            You are analyzing this marketing strategy plan:
            {plan_summary}

            Define 5-6 relevant content categories for this brand.
            Return a JSON array of objects with EXACTLY these keys:
            [
                {{
                    "category": "Category Name (e.g., Educational, Promotional)",
                    "description": "Brief description of what this category covers",
                    "goal": "What business/marketing goal this category serves"
                }}
            ]
            """

        elif current_task == "content_ideas":
            categories = state["extra_data"]["content_output"].get("content_categories", [])
            cat_names  = [c.get("category", "") for c in categories]
            prompt = f"""
            You are a creative content strategist for this brand:
            {plan_summary}

            Content categories available: {json.dumps(cat_names)}

            Generate 8 high-quality, creative and specific content ideas for this brand.
            Each idea must be aligned with the strategy and target audience.
            Return a JSON array of objects with EXACTLY these keys:
            [
                {{
                    "title": "Specific content title or concept",
                    "category": "One of the content categories",
                    "description": "2-3 sentence description of the content idea",
                    "formats": ["Post", "Reel", "Blog", "Ad", "Video", "Story", "Carousel", "Email"],
                    "platforms": ["Instagram", "LinkedIn", "YouTube", "Twitter", "Facebook", "Google Ads", "Email"],
                    "priority": "High / Medium / Low",
                    "impact": "Expected business impact in 1 sentence",
                    "caption_hook": "A compelling opening line or caption hook for this content"
                }}
            ]
            Only pick formats and platforms that make sense for this specific idea.
            """

        elif current_task == "tone_and_style":
            prompt = f"""
            Based on this marketing strategy:
            {plan_summary}

            Define the ideal content tone, style, and voice for this brand's content.
            Return a JSON object with EXACTLY these keys:
            {{
                "tone": "e.g., Professional, Friendly, Inspiring, Authoritative, Conversational",
                "style": "e.g., Educational storytelling, Data-driven, Visual-first, Story-led",
                "voice": "e.g., Empathetic expert, Bold disruptor, Helpful advisor",
                "dos": ["Do this 1", "Do this 2", "Do this 3"],
                "donts": ["Avoid this 1", "Avoid this 2", "Avoid this 3"],
                "content_pillars": ["Pillar 1", "Pillar 2", "Pillar 3", "Pillar 4"]
            }}
            """

        if prompt:
            _step("Sending prompt to AI...")
            try:
                raw = await AIClient.generate_completion(tenant_id, prompt, SYSTEM_PROMPT)
                print(f"\n  📨 RAW AI RESPONSE ({current_task}):")
                print("  " + "·" * 50)
                print(raw)
                print("  " + "·" * 50)

                # Strip markdown fences
                cleaned = raw
                if "```json" in cleaned:
                    cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned:
                    cleaned = cleaned.split("```")[1].split("```")[0].strip()

                parsed = json.loads(cleaned)

                if current_task == "content_categories":
                    state["extra_data"]["content_output"]["content_categories"] = parsed
                elif current_task == "content_ideas":
                    state["extra_data"]["content_output"]["content_ideas"] = parsed
                elif current_task == "tone_and_style":
                    state["extra_data"]["content_output"]["tone_style"] = parsed

                _ok(f"Parsed '{current_task}'", f"{len(parsed) if isinstance(parsed, list) else 'object'} items")
                logger.info(f"ContentIdeasAgent: parsed {current_task} successfully")

            except Exception as e:
                _err(f"LLM task '{current_task}' failed", e)
                print(traceback.format_exc())
                logger.error(f"ContentIdeasAgent: {current_task} error: {e}")

        state["iteration"] = iteration
        state["confidence"] = 0.0
        return state

    # ─────────────────────────────────────────────────────────────
    # STEP 3: REFLECT
    # ─────────────────────────────────────────────────────────────
    async def _reflect(self, state: AgentState) -> AgentState:
        remaining = state.get("plan", [])
        _banner("REFLECT — Evaluating Progress")
        if remaining:
            state["confidence"] = 0.0
            _step(f"Tasks remaining: {len(remaining)}", remaining)
            _step("Decision", "→ Loop back to PLAN")
        else:
            state["confidence"] = 0.95
            _ok("All sub-tasks complete! → FINALIZE")
        state["needs_human_review"] = False
        return state

    # ─────────────────────────────────────────────────────────────
    # STEP 4: FINALIZE
    # ─────────────────────────────────────────────────────────────
    async def _finalize(self, state: AgentState) -> AgentState:
        output     = state["extra_data"]["content_output"]
        plan_id    = state["extra_data"].get("plan_id", "")
        tenant_id  = state["tenant_id"]
        source     = state["extra_data"].get("source_plan") or {}

        _banner("FINALIZE — Building Content Ideas Output")

        final_output = {
            "plan_id":            plan_id,
            "plan_name":          output.get("plan_name", ""),
            "company_name":       source.get("company_name", ""),
            "industry":           source.get("industry", ""),
            "target_audience":    output.get("target_audience", ""),
            "overview":           output.get("overview", ""),
            "generated_at":       datetime.utcnow().isoformat(),
            "content_categories": output.get("content_categories", []),
            "content_ideas":      output.get("content_ideas", []),
            "tone_style":         output.get("tone_style", {}),
        }

        state["output"] = final_output

        print("\n  📋 FINAL CONTENT IDEAS OUTPUT:")
        print("  " + "═" * 58)
        print(json.dumps(final_output, indent=4, ensure_ascii=False))
        print("  " + "═" * 58)
        _ok(f"Ideas for: {final_output['plan_name']}")
        _step(f"Categories: {len(final_output['content_categories'])}")
        _step(f"Ideas:      {len(final_output['content_ideas'])}")

        # ── Persist to DB ─────────────────────────────────────────
        _banner("FINALIZE — Saving to Database")
        _step("tenant_id", tenant_id)
        _step("plan_id",   plan_id)
        try:
            async with async_session_maker() as session:
                record = ContentIdeasResult(
                    tenant_id=tenant_id,
                    plan_id=plan_id,
                    plan_name=final_output["plan_name"],
                    industry=final_output["industry"],
                    result_json=json.dumps(final_output, ensure_ascii=False)
                )
                session.add(record)
                await session.commit()
                await session.refresh(record)
            _ok(f"Saved to DB with ID: {record.id}")
            logger.info(f"ContentIdeasResult saved: id={record.id}")
        except Exception as e:
            _err("CRITICAL — Failed to save content ideas to DB", e)
            print(traceback.format_exc())
            logger.error(f"Failed to save ContentIdeasResult: {e}\n{traceback.format_exc()}")

        _banner("✅ CONTENT IDEAS AGENT COMPLETE")
        return state
