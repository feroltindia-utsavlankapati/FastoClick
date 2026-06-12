from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import fitz  # PyMuPDF
import io
import json
import logging

from shared.database import async_session_maker
from shared.models.tenant import CompanyContext, CompanyProduct
# Use internal access verification or header verification
from shared.dependencies import verify_internal_access

router = APIRouter()
logger = logging.getLogger(__name__)

class CompanyContextUpdate(BaseModel):
    tenant_id: str
    project_id: Optional[str] = None
    link: Optional[str] = None
    focus: Optional[str] = None
    product_details: Optional[str] = None
    service_details: Optional[str] = None
    company_details: Optional[str] = None

class CompanyProductCreate(BaseModel):
    tenant_id: str
    project_id: Optional[str] = None
    name: str
    type: str  # 'product' or 'service'
    description: Optional[str] = None
    target_audience: Optional[str] = None
    features: Optional[str] = None

class CompanyProductUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    target_audience: Optional[str] = None
    features: Optional[str] = None

async def background_scrape_and_update(tenant_id: str, project_id: Optional[str], url: str):
    from shared.utils.scraper import run_scraper_pipeline
    try:
        logger.info(f"Background scrape triggered for tenant {tenant_id} and link {url}")
        details = await run_scraper_pipeline(tenant_id, url)
        
        async with async_session_maker() as session:
            stmt = select(CompanyContext).where(CompanyContext.tenant_id == tenant_id)
            if project_id:
                stmt = stmt.where(CompanyContext.project_id == project_id)
            result = await session.execute(stmt)
            context = result.scalars().first()
            if not context:
                context = CompanyContext(tenant_id=tenant_id, project_id=project_id)
                session.add(context)
                
            context.company_details = json.dumps(details)
            
            # Update blank/empty fields with scraped data
            if not context.focus or context.focus.strip() == "":
                context.focus = details.get("company_overview", "")[:1000]
                
            if not context.product_details or context.product_details.strip() == "":
                prod_list = details.get("products", [])
                if prod_list:
                    context.product_details = ", ".join(prod_list)
                    
            if not context.service_details or context.service_details.strip() == "":
                serv_list = details.get("services", [])
                if serv_list:
                    context.service_details = ", ".join(serv_list)
                    
            await session.commit()
            logger.info(f"Background scrape and update successfully completed for tenant {tenant_id}")
    except Exception as e:
        logger.error(f"Error in background_scrape_and_update for tenant {tenant_id}: {str(e)}")

@router.get("/context/{tenant_id}")
async def get_company_context(tenant_id: str, project_id: Optional[str] = None):
    async with async_session_maker() as session:
        stmt = select(CompanyContext).where(CompanyContext.tenant_id == tenant_id)
        if project_id:
            stmt = stmt.where(CompanyContext.project_id == project_id)
        result = await session.execute(stmt)
        context = result.scalars().first()
        if not context:
            return {"success": True, "data": None}
        
        return {
            "success": True, 
            "data": {
                "link": context.link,
                "focus": context.focus,
                "product_details": context.product_details,
                "service_details": context.service_details,
                "company_details": context.company_details,
                "has_documents": bool(context.extracted_document_text)
            }
        }

@router.post("/context")
async def update_company_context(data: CompanyContextUpdate, background_tasks: BackgroundTasks):
    async with async_session_maker() as session:
        stmt = select(CompanyContext).where(CompanyContext.tenant_id == data.tenant_id)
        if data.project_id:
            stmt = stmt.where(CompanyContext.project_id == data.project_id)
        result = await session.execute(stmt)
        context = result.scalars().first()
        
        old_link = context.link if context else None
        
        if not context:
            context = CompanyContext(tenant_id=data.tenant_id, project_id=data.project_id)
            session.add(context)
            
        if data.link is not None: context.link = data.link
        if data.focus is not None: context.focus = data.focus
        if data.product_details is not None: context.product_details = data.product_details
        if data.service_details is not None: context.service_details = data.service_details
        if data.company_details is not None: context.company_details = data.company_details
        
        await session.commit()
        
        # Trigger background scraping if link has been added or updated
        if data.link and data.link.strip() != "" and data.link != old_link:
            background_tasks.add_task(background_scrape_and_update, data.tenant_id, data.project_id, data.link.strip())
            
        return {"success": True, "message": "Company context updated"}

@router.post("/upload")
async def upload_company_document(
    tenant_id: str = Form(...),
    project_id: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported currently")
        
    try:
        content = await file.read()
        
        # Extract text using PyMuPDF
        doc = fitz.open(stream=content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
            
        # Store in DB
        async with async_session_maker() as session:
            stmt = select(CompanyContext).where(CompanyContext.tenant_id == tenant_id)
            if project_id:
                stmt = stmt.where(CompanyContext.project_id == project_id)
            result = await session.execute(stmt)
            context = result.scalars().first()
            
            if not context:
                context = CompanyContext(tenant_id=tenant_id, project_id=project_id)
                session.add(context)
                
            # Append text
            existing_text = context.extracted_document_text or ""
            context.extracted_document_text = existing_text + f"\n\n--- Document: {file.filename} ---\n" + text
            
            await session.commit()
            
        return {"success": True, "message": f"Successfully extracted {len(text)} characters from {file.filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

# =========================
# Product & Service Routes
# =========================

@router.get("/products/{tenant_id}")
async def list_products(tenant_id: str, project_id: Optional[str] = None):
    async with async_session_maker() as session:
        stmt = select(CompanyProduct).where(CompanyProduct.tenant_id == tenant_id)
        if project_id:
            stmt = stmt.where(CompanyProduct.project_id == project_id)
        stmt = stmt.order_by(CompanyProduct.created_at.desc())
        result = await session.execute(stmt)
        products = result.scalars().all()
        return {
            "success": True,
            "data": [
                {
                    "id": p.id,
                    "tenant_id": p.tenant_id,
                    "name": p.name,
                    "type": p.type,
                    "description": p.description,
                    "target_audience": p.target_audience,
                    "features": p.features,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None
                } for p in products
            ]
        }

@router.post("/products")
async def create_product(data: CompanyProductCreate):
    async with async_session_maker() as session:
        product = CompanyProduct(
            tenant_id=data.tenant_id,
            project_id=data.project_id,
            name=data.name,
            type=data.type,
            description=data.description,
            target_audience=data.target_audience,
            features=data.features
        )
        session.add(product)
        await session.commit()
        await session.refresh(product)
        return {
            "success": True,
            "message": "Product created successfully",
            "data": {
                "id": product.id,
                "tenant_id": product.tenant_id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "target_audience": product.target_audience,
                "features": product.features
            }
        }

@router.put("/products/{product_id}")
async def update_product(product_id: str, data: CompanyProductUpdate):
    async with async_session_maker() as session:
        result = await session.execute(select(CompanyProduct).where(CompanyProduct.id == product_id))
        product = result.scalars().first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if data.name is not None: product.name = data.name
        if data.type is not None: product.type = data.type
        if data.description is not None: product.description = data.description
        if data.target_audience is not None: product.target_audience = data.target_audience
        if data.features is not None: product.features = data.features
        
        await session.commit()
        await session.refresh(product)
        return {
            "success": True,
            "message": "Product updated successfully",
            "data": {
                "id": product.id,
                "tenant_id": product.tenant_id,
                "name": product.name,
                "type": product.type,
                "description": product.description,
                "target_audience": product.target_audience,
                "features": product.features
            }
        }

@router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    async with async_session_maker() as session:
        result = await session.execute(select(CompanyProduct).where(CompanyProduct.id == product_id))
        product = result.scalars().first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        await session.delete(product)
        await session.commit()
        return {
            "success": True,
            "message": "Product deleted successfully"
        }

