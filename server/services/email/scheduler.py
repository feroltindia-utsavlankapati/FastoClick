import asyncio
import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from shared.database import async_session_maker
from shared.models.email import EmailCampaign, EmailCampaignContact, Contact, EmailTemplate
from sqlalchemy import select
from .email_sender import process_campaign

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def check_pending_campaigns():
    async with async_session_maker() as session:
        # Find campaigns that are scheduled or running, where scheduled_at <= now
        now = datetime.now(timezone.utc)
        stmt = select(EmailCampaign).where(
            EmailCampaign.status.in_(["scheduled", "running"]),
            (EmailCampaign.scheduled_at == None) | (EmailCampaign.scheduled_at <= now)
        )
        result = await session.execute(stmt)
        campaigns = result.scalars().all()
        
        for campaign in campaigns:
            if campaign.status == "scheduled":
                campaign.status = "running"
                await session.commit()
            
            # Start processing asynchronously in background to not block scheduler
            asyncio.create_task(process_campaign(campaign.id))


async def start_scheduler():
    scheduler.add_job(
        check_pending_campaigns,
        trigger=IntervalTrigger(seconds=60),
        id="check_pending_campaigns",
        name="Check and dispatch pending email campaigns",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Email scheduler started.")

async def stop_scheduler():
    scheduler.shutdown()
    logger.info("Email scheduler stopped.")
