from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from shared.database import async_session_maker
from shared.models.email import EmailCampaign, EmailCampaignContact, Contact, EmailTemplate, EmailLog
from shared.dependencies import get_current_tenant, TenantContext
from ..schemas import EmailCampaignCreate, EmailCampaignResponse, CampaignAnalyticsResponse
from typing import List, Optional
from datetime import datetime, timezone
from ..email_sender import process_campaign

router = APIRouter()

async def get_db():
    async with async_session_maker() as session:
        yield session

@router.get("/", response_model=List[EmailCampaignResponse])
async def list_campaigns(
    project_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    stmt = select(EmailCampaign).where(EmailCampaign.tenant_id == tenant_id)
    if project_id:
        stmt = stmt.where(EmailCampaign.project_id == project_id)
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/", response_model=EmailCampaignResponse)
async def create_campaign(
    campaign: EmailCampaignCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    
    # Create Campaign
    status = "scheduled" if campaign.scheduled_at else "running"
    # If no scheduled_at is provided, we set it to now to run immediately
    scheduled_at = campaign.scheduled_at or datetime.now(timezone.utc)
    
    new_campaign = EmailCampaign(
        tenant_id=tenant_id,
        project_id=campaign.project_id,
        name=campaign.name,
        template_id=campaign.template_id,
        sender_email=campaign.sender_email,
        status=status,
        scheduled_at=scheduled_at
    )
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)
    
    # Add Contacts to Campaign
    for contact_id in campaign.contact_ids:
        cc = EmailCampaignContact(
            campaign_id=new_campaign.id,
            contact_id=contact_id
        )
        db.add(cc)
        
    await db.commit()
    
    if status == "running":
        background_tasks.add_task(process_campaign, new_campaign.id)
        
    return new_campaign

@router.put("/{campaign_id}/cancel")
async def cancel_campaign(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    
    stmt = select(EmailCampaign).where(EmailCampaign.id == campaign_id, EmailCampaign.tenant_id == tenant_id)
    result = await db.execute(stmt)
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if campaign.status in ["completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a campaign with status: {campaign.status}")
        
    campaign.status = "cancelled"
    await db.commit()
    
    return {"message": "Campaign cancelled successfully"}

@router.get("/{campaign_id}/analytics", response_model=CampaignAnalyticsResponse)
async def get_campaign_analytics(
    campaign_id: str,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    tenant_id = tenant.id
    
    # Ensure campaign belongs to tenant
    stmt_camp = select(EmailCampaign).where(EmailCampaign.id == campaign_id, EmailCampaign.tenant_id == tenant_id)
    camp = await db.execute(stmt_camp)
    if not camp.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campaign not found")

    stmt_logs = select(EmailLog.event_type, func.count(EmailLog.id)).where(EmailLog.campaign_id == campaign_id).group_by(EmailLog.event_type)
    result = await db.execute(stmt_logs)
    
    analytics = {
        "sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "bounced": 0, "unsubscribed": 0
    }
    for event_type, count in result.all():
        if event_type in analytics:
            analytics[event_type] = count
            
    return CampaignAnalyticsResponse(
        total_sent=analytics["sent"],
        total_delivered=analytics["delivered"],
        total_opened=analytics["opened"],
        total_clicked=analytics["clicked"],
        total_bounced=analytics["bounced"],
        total_unsubscribed=analytics["unsubscribed"]
    )
