from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import fitz  # PyMuPDF
import io

from shared.database import async_session_maker
from shared.models.tenant import CompanyContext
# Use internal access verification or header verification
from shared.dependencies import verify_internal_access

router = APIRouter()

class CompanyContextUpdate(BaseModel):
    tenant_id: str
    link: Optional[str] = None
    focus: Optional[str] = None
    product_details: Optional[str] = None
    service_details: Optional[str] = None
    company_details: Optional[str] = None

@router.get("/context/{tenant_id}")
async def get_company_context(tenant_id: str):
    async with async_session_maker() as session:
        result = await session.execute(select(CompanyContext).where(CompanyContext.tenant_id == tenant_id))
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
async def update_company_context(data: CompanyContextUpdate):
    async with async_session_maker() as session:
        result = await session.execute(select(CompanyContext).where(CompanyContext.tenant_id == data.tenant_id))
        context = result.scalars().first()
        
        if not context:
            context = CompanyContext(tenant_id=data.tenant_id)
            session.add(context)
            
        if data.link is not None: context.link = data.link
        if data.focus is not None: context.focus = data.focus
        if data.product_details is not None: context.product_details = data.product_details
        if data.service_details is not None: context.service_details = data.service_details
        if data.company_details is not None: context.company_details = data.company_details
        
        await session.commit()
        return {"success": True, "message": "Company context updated"}

@router.post("/upload")
async def upload_company_document(
    tenant_id: str = Form(...),
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
            result = await session.execute(select(CompanyContext).where(CompanyContext.tenant_id == tenant_id))
            context = result.scalars().first()
            
            if not context:
                context = CompanyContext(tenant_id=tenant_id)
                session.add(context)
                
            # Append text
            existing_text = context.extracted_document_text or ""
            context.extracted_document_text = existing_text + f"\n\n--- Document: {file.filename} ---\n" + text
            
            await session.commit()
            
        return {"success": True, "message": f"Successfully extracted {len(text)} characters from {file.filename}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
