from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.future import select
from sqlalchemy import delete
from shared.database import async_session_maker
from shared.models.tenant import StrategyPlan
from shared.dependencies import get_current_tenant, TenantContext
from shared.utils.ai_integration import AIClient
from pydantic import BaseModel
import json
from typing import Optional

router = APIRouter()


class RefineRequest(BaseModel):
    feedback: str


class PlanUpdateRequest(BaseModel):
    plan: dict


@router.get("/plans")
async def list_plans(
    project_id: Optional[str] = None,
    product_id: Optional[str] = None,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Return all saved strategy plans for the authenticated tenant, newest first."""
    async with async_session_maker() as session:
        query = select(StrategyPlan).where(StrategyPlan.tenant_id == tenant.id)
        if project_id:
            query = query.where(StrategyPlan.project_id == project_id)
        if product_id:
            query = query.where(StrategyPlan.product_id == product_id)
        query = query.order_by(StrategyPlan.created_at.desc())
        
        result = await session.execute(query)
        plans = result.scalars().all()
        
        # Load products to get names
        from shared.models.tenant import CompanyProduct
        prod_result = await session.execute(select(CompanyProduct).where(CompanyProduct.tenant_id == tenant.id))
        products = prod_result.scalars().all()
        prod_map = {p.id: p.name for p in products}

    return {
        "success": True,
        "data": [
            {
                "id":           p.id,
                "tenant_id":    p.tenant_id,
                "product_id":   p.product_id,
                "product_name": prod_map.get(p.product_id) if p.product_id else None,
                "company_name": p.company_name,
                "industry":     p.industry,
                "user_prompt":  p.user_prompt,
                "plan":         json.loads(p.plan_json),
                "created_at":   p.created_at.isoformat() if p.created_at else None
            }
            for p in plans
        ]
    }



@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: str, tenant: TenantContext = Depends(get_current_tenant)):
    """Permanently delete a strategy plan by ID (must belong to the authenticated tenant)."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(StrategyPlan).where(
                StrategyPlan.id == plan_id,
                StrategyPlan.tenant_id == tenant.id
            )
        )
        plan = result.scalars().first()

        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found or access denied.")

        await session.execute(
            delete(StrategyPlan).where(StrategyPlan.id == plan_id)
        )
        await session.commit()

    return {"success": True, "message": f"Plan {plan_id} permanently deleted."}


@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    req: PlanUpdateRequest,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Update a strategy plan's structural content in-place."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(StrategyPlan).where(
                StrategyPlan.id == plan_id,
                StrategyPlan.tenant_id == tenant.id
            )
        )
        plan_record = result.scalars().first()

        if not plan_record:
            raise HTTPException(status_code=404, detail="Strategy plan not found or access denied.")

        # Update core details and outer fields if present inside the dictionary
        company_name = req.plan.get("company_name", plan_record.company_name)
        industry = req.plan.get("industry", plan_record.industry)
        
        plan_record.company_name = company_name
        plan_record.industry = industry
        plan_record.plan_json = json.dumps(req.plan, ensure_ascii=False)
        
        await session.commit()
        await session.refresh(plan_record)

        # Load products to get names
        from shared.models.tenant import CompanyProduct
        prod_result = await session.execute(select(CompanyProduct).where(CompanyProduct.tenant_id == tenant.id))
        products = prod_result.scalars().all()
        prod_map = {p.id: p.name for p in products}

    return {
        "success": True,
        "data": {
            "id":           plan_record.id,
            "tenant_id":    plan_record.tenant_id,
            "product_id":   plan_record.product_id,
            "product_name": prod_map.get(plan_record.product_id) if plan_record.product_id else None,
            "company_name": plan_record.company_name,
            "industry":     plan_record.industry,
            "user_prompt":  plan_record.user_prompt,
            "plan":         req.plan,
            "created_at":   plan_record.created_at.isoformat() if plan_record.created_at else None
        }
    }


@router.post("/plans/{plan_id}/refine")
async def refine_plan(
    plan_id: str,
    req: RefineRequest,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Intelligently refine a strategy plan based on the user's specific feedback/queries,
    updating the plan in-place and returning the updated document.
    """
    async with async_session_maker() as session:
        result = await session.execute(
            select(StrategyPlan).where(
                StrategyPlan.id == plan_id,
                StrategyPlan.tenant_id == tenant.id
            )
        )
        plan_record = result.scalars().first()

        if not plan_record:
            raise HTTPException(status_code=404, detail="Strategy plan not found or access denied.")

        current_plan_data = json.loads(plan_record.plan_json)

    system_prompt = """
    You are an elite AI Marketing Strategy Planner specializing in iterative refinement.
    You will receive a complete marketing strategy plan and the user's direct feedback/requested changes.
    Your task is to intelligently modify the plan to satisfy all aspects of the user's feedback.
    
    CRITICAL RULES:
    1. Retain the general structure, formatting, company name, industry, and successful components of the original plan except where modifications are explicitly requested or logically necessitated by the feedback.
    2. Do NOT introduce placeholders or truncated arrays. Output the entire refined plan with all items fully developed.
    3. Generate ONLY valid, parsable JSON matching the exact original structure.
    4. Do NOT wrap the JSON in markdown formatting like ```json or ```.
    """

    prompt = f"""
    Original Strategy Plan:
    {json.dumps(current_plan_data, indent=2, ensure_ascii=False)}

    User's Feedback / Requested Changes:
    "{req.feedback}"

    Return the refined strategy plan matching this structure:
    {{
        "company_name": "Must match original",
        "industry": "Refine if requested, otherwise keep",
        "target_audience": "Refine if requested, otherwise keep",
        "generated_at": "Must match original",
        "strategy": {{
            "business_goal": "Refine if requested, otherwise keep",
            "marketing_goal": "Refine if requested, otherwise keep",
            "core_strategy": ["Strategy 1", "Strategy 2", ...]
        }},
        "campaign_plans": {{
            "phases": [
                {{
                    "phase": "Phase name",
                    "duration": "Duration",
                    "tasks": ["Task 1", "Task 2"]
                }}
            ],
            "channels": [
                {{
                    "channel": "Channel name",
                    "objective": "Objective",
                    "kpi": "KPI"
                }}
            ],
            "execution_plan": [
                {{
                    "week": "Week info",
                    "activity": "Activity description",
                    "owner": "Owner",
                    "status": "Status (e.g. Pending)"
                }}
            ]
        }}
    }}
    """

    try:
        raw_result = await AIClient.generate_completion(tenant.id, prompt, system_prompt)

        # Handle Mock AI Response fallback
        if raw_result.startswith("[MOCK AI RESPONSE"):
            # If mock, let's simulate a change in the business/marketing goal or core strategy
            parsed_plan = current_plan_data.copy()
            parsed_plan["strategy"]["business_goal"] += f" (Refined based on: {req.feedback})"
            parsed_plan["strategy"]["core_strategy"].append(f"Additional refined strategy: {req.feedback}")
        else:
            cleaned = raw_result.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()

            parsed_plan = json.loads(cleaned)

        async with async_session_maker() as session:
            result = await session.execute(
                select(StrategyPlan).where(StrategyPlan.id == plan_id)
            )
            record = result.scalars().first()
            if record:
                record.plan_json = json.dumps(parsed_plan, ensure_ascii=False)
                # Append user feedback to user prompt to track evolution
                record.user_prompt = f"{record.user_prompt or ''}\n\n[Refined via: {req.feedback}]"
                await session.commit()
                await session.refresh(record)
                plan_record = record

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Refinement generation failed: {str(e)}"
        )

    return {
        "success": True,
        "data": {
            "id":           plan_record.id,
            "company_name": plan_record.company_name,
            "industry":     plan_record.industry,
            "user_prompt":  plan_record.user_prompt,
            "plan":         parsed_plan,
            "created_at":   plan_record.created_at.isoformat() if plan_record.created_at else None
        }
    }

