from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.future import select
from sqlalchemy import delete
from shared.database import async_session_maker
from shared.models.tenant import ContentIdeasResult
from shared.dependencies import get_current_tenant, TenantContext
from shared.utils.ai_integration import AIClient
from pydantic import BaseModel
import json
from typing import Optional

router = APIRouter()


class RefineRequest(BaseModel):
    feedback: str


class ContentIdeasUpdateRequest(BaseModel):
    result: dict


@router.get("/content-ideas")
async def list_content_ideas(
    project_id: Optional[str] = None,
    product_id: Optional[str] = None,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Return all content idea results for the authenticated tenant, newest first."""
    async with async_session_maker() as session:
        query = select(ContentIdeasResult).where(ContentIdeasResult.tenant_id == tenant.id)
        if project_id:
            query = query.where(ContentIdeasResult.project_id == project_id)
        if product_id:
            query = query.where(ContentIdeasResult.product_id == product_id)
        query = query.order_by(ContentIdeasResult.created_at.desc())
        
        result = await session.execute(query)
        records = result.scalars().all()
        
        # Load products to get names
        from shared.models.tenant import CompanyProduct
        prod_result = await session.execute(select(CompanyProduct).where(CompanyProduct.tenant_id == tenant.id))
        products = prod_result.scalars().all()
        prod_map = {p.id: p.name for p in products}

    return {
        "success": True,
        "data": [
            {
                "id":           r.id,
                "tenant_id":    r.tenant_id,
                "product_id":   r.product_id,
                "product_name": prod_map.get(r.product_id) if r.product_id else None,
                "plan_id":      r.plan_id,
                "plan_name":    r.plan_name,
                "industry":     r.industry,
                "result":       json.loads(r.result_json),
                "created_at":   r.created_at.isoformat() if r.created_at else None
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


@router.put("/content-ideas/{result_id}")
async def update_content_ideas(
    result_id: str,
    req: ContentIdeasUpdateRequest,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """Update a content ideas result structural content in-place."""
    async with async_session_maker() as session:
        result = await session.execute(
            select(ContentIdeasResult).where(
                ContentIdeasResult.id == result_id,
                ContentIdeasResult.tenant_id == tenant.id
            )
        )
        record = result.scalars().first()

        if not record:
            raise HTTPException(status_code=404, detail="Content ideas result not found or access denied.")

        # Update core details and outer fields if present inside the dictionary
        industry = req.result.get("industry", record.industry)
        plan_name = req.result.get("plan_name", record.plan_name)
        
        record.industry = industry
        record.plan_name = plan_name
        record.result_json = json.dumps(req.result, ensure_ascii=False)
        
        await session.commit()
        await session.refresh(record)

    return {
        "success": True,
        "data": {
            "id":         record.id,
            "plan_id":    record.plan_id,
            "plan_name":  record.plan_name,
            "industry":   record.industry,
            "result":     req.result,
            "created_at": record.created_at.isoformat() if record.created_at else None
        }
    }


@router.post("/content-ideas/{result_id}/refine")
async def refine_content_ideas(
    result_id: str,
    req: RefineRequest,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Intelligently refine a set of content ideas based on the user's specific feedback/queries,
    updating the result in-place and returning the updated document.
    """
    async with async_session_maker() as session:
        result = await session.execute(
            select(ContentIdeasResult).where(
                ContentIdeasResult.id == result_id,
                ContentIdeasResult.tenant_id == tenant.id
            )
        )
        record = result.scalars().first()

        if not record:
            raise HTTPException(status_code=404, detail="Content ideas result not found or access denied.")

        current_ideas_data = json.loads(record.result_json)

    system_prompt = """
    You are an elite AI Content Strategist and Creative Director specializing in iterative refinement.
    You will receive a complete set of generated content ideas, categories, and tone/style guidelines, along with the user's direct feedback/requested changes.
    Your task is to intelligently modify and improve the content ideas to satisfy all aspects of the user's feedback.

    CRITICAL RULES:
    1. Retain the general structure, formatting, tone voice, and successful ideas of the original document except where modifications are explicitly requested or logically necessitated by the feedback.
    2. Do NOT introduce placeholders or truncated arrays. Output the entire refined result with all categories, ideas, and style guides fully developed.
    3. Generate ONLY valid, parsable JSON matching the exact original structure.
    4. Do NOT wrap the JSON in markdown formatting like ```json or ```.
    """

    prompt = f"""
    Original Content Ideas Result:
    {json.dumps(current_ideas_data, indent=2, ensure_ascii=False)}

    User's Feedback / Requested Changes:
    "{req.feedback}"

    Return the refined content ideas result matching this structure:
    {{
        "plan_id": "Must match original",
        "plan_name": "Must match original",
        "company_name": "Must match original",
        "industry": "Refine if requested, otherwise keep",
        "target_audience": "Refine if requested, otherwise keep",
        "overview": "Refine if requested, otherwise keep",
        "generated_at": "Must match original",
        "content_categories": [
            {{
                "category": "Category name",
                "description": "Description",
                "goal": "Goal"
            }}
        ],
        "content_ideas": [
            {{
                "title": "Specific concept title",
                "category": "One of the categories",
                "description": "Description of the idea",
                "formats": ["Post", "Reel", "Blog", "Ad", "Video", "Story", "Carousel", "Email"],
                "platforms": ["Instagram", "LinkedIn", "YouTube", "Twitter", "Facebook", "Google Ads", "Email"],
                "priority": "High / Medium / Low",
                "impact": "Expected impact",
                "caption_hook": "Caption hook or opening line"
            }}
        ],
        "tone_style": {{
            "tone": "Tone style",
            "style": "Writing style",
            "voice": "Brand voice",
            "dos": ["Do 1", "Do 2", ...],
            "donts": ["Don't 1", "Don't 2", ...],
            "content_pillars": ["Pillar 1", "Pillar 2", ...]
        }}
    }}
    """

    try:
        raw_result = await AIClient.generate_completion(tenant.id, prompt, system_prompt)

        # Handle Mock AI Response fallback
        if raw_result.startswith("[MOCK AI RESPONSE"):
            parsed_ideas = current_ideas_data.copy()
            # Simulate a small change in tone/style to reflect the refinement
            if "tone_style" in parsed_ideas:
                parsed_ideas["tone_style"]["tone"] += f" (Refined based on: {req.feedback})"
                parsed_ideas["tone_style"]["dos"].append(f"Refinement guideline: {req.feedback}")
        else:
            cleaned = raw_result.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()

            parsed_ideas = json.loads(cleaned)

        async with async_session_maker() as session:
            result = await session.execute(
                select(ContentIdeasResult).where(ContentIdeasResult.id == result_id)
            )
            db_record = result.scalars().first()
            if db_record:
                db_record.result_json = json.dumps(parsed_ideas, ensure_ascii=False)
                await session.commit()
                await session.refresh(db_record)
                record = db_record

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Refinement generation failed: {str(e)}"
        )

    return {
        "success": True,
        "data": {
            "id":           record.id,
            "plan_id":      record.plan_id,
            "plan_name":    record.plan_name,
            "industry":     record.industry,
            "result":       parsed_ideas,
            "created_at":   record.created_at.isoformat() if record.created_at else None
        }
    }

