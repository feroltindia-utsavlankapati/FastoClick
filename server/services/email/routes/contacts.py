from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from shared.database import async_session_maker
from shared.models.email import Contact
from shared.dependencies import get_current_tenant, TenantContext
from ..schemas import ContactCreate, ContactResponse
from typing import List
import pandas as pd
import io
import json

router = APIRouter()

async def get_db():
    async with async_session_maker() as session:
        yield session

@router.get("/", response_model=List[ContactResponse])
async def list_contacts(
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    stmt = select(Contact).where(Contact.tenant_id == tenant_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=ContactResponse)
async def create_contact(
    contact: ContactCreate,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    new_contact = Contact(
        tenant_id=tenant_id,
        first_name=contact.first_name,
        last_name=contact.last_name,
        email=contact.email,
        company_name=contact.company_name,
        designation=contact.designation,
        phone_number=contact.phone_number,
        custom_fields_json=contact.custom_fields_json
    )
    db.add(new_contact)
    await db.commit()
    await db.refresh(new_contact)
    return new_contact

@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    stmt = delete(Contact).where(Contact.id == contact_id, Contact.tenant_id == tenant_id)
    await db.execute(stmt)
    await db.commit()
    return {"message": "Contact deleted"}

@router.post("/upload")
async def upload_contacts(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    contents = await file.read()
    
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Invalid file format. Use CSV or Excel.")
            
        # Clean column names (lowercase, replace spaces)
        df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
        
        # We expect at least an email column
        if "email" not in df.columns:
            raise HTTPException(status_code=400, detail="Uploaded file must contain an 'email' column.")
        
        contacts_added = 0
        for _, row in df.iterrows():
            email = str(row.get("email")).strip()
            if not email or email.lower() == "nan":
                continue
                
            first_name = str(row.get("first_name", "")) if pd.notna(row.get("first_name")) else None
            last_name = str(row.get("last_name", "")) if pd.notna(row.get("last_name")) else None
            company_name = str(row.get("company_name", "")) if pd.notna(row.get("company_name")) else None
            designation = str(row.get("designation", "")) if pd.notna(row.get("designation")) else None
            phone_number = str(row.get("phone_number", "")) if pd.notna(row.get("phone_number")) else None
            
            # Check for existing
            stmt = select(Contact).where(Contact.tenant_id == tenant_id, Contact.email == email)
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()
            
            if not existing:
                new_contact = Contact(
                    tenant_id=tenant_id,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    company_name=company_name,
                    designation=designation,
                    phone_number=phone_number
                )
                db.add(new_contact)
                contacts_added += 1
                
        await db.commit()
        return {"message": f"Successfully imported {contacts_added} contacts."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
