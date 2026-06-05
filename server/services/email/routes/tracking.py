from fastapi import APIRouter, Response, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from shared.database import async_session_maker
from shared.models.email import EmailLog, Contact
import base64

router = APIRouter()

# A 1x1 transparent GIF pixel
PIXEL_DATA = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)

@router.get("/open/{log_id}.png")
async def track_open(log_id: str):
    try:
        async with async_session_maker() as session:
            stmt = select(EmailLog).where(EmailLog.id == log_id)
            result = await session.execute(stmt)
            log = result.scalar_one_or_none()
            
            if log and log.event_type in ["sent", "delivered"]:
                # Record open event
                open_log = EmailLog(
                    tenant_id=log.tenant_id,
                    campaign_id=log.campaign_id,
                    contact_id=log.contact_id,
                    event_type="opened"
                )
                session.add(open_log)
                await session.commit()
    except Exception:
        pass # Silently fail for tracking pixels
        
    return Response(content=PIXEL_DATA, media_type="image/gif")

@router.get("/click/{log_id}")
async def track_click(log_id: str, url: str = Query(...)):
    try:
        async with async_session_maker() as session:
            stmt = select(EmailLog).where(EmailLog.id == log_id)
            result = await session.execute(stmt)
            log = result.scalar_one_or_none()
            
            if log:
                # Record click event
                click_log = EmailLog(
                    tenant_id=log.tenant_id,
                    campaign_id=log.campaign_id,
                    contact_id=log.contact_id,
                    event_type="clicked",
                    url_clicked=url
                )
                session.add(click_log)
                await session.commit()
    except Exception:
        pass # Silently fail
        
    return RedirectResponse(url=url)
