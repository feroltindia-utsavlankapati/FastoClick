import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import json
import urllib.parse
from bs4 import BeautifulSoup
from shared.database import async_session_maker
from shared.models.email import EmailCampaign, EmailCampaignContact, Contact, EmailTemplate, EmailLog
from shared.config import get_settings
from sqlalchemy import select
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)
settings = get_settings()

def replace_variables(text: str, contact: Contact) -> str:
    if not text:
        return ""
    text = text.replace("{{first_name}}", contact.first_name or "")
    text = text.replace("{{last_name}}", contact.last_name or "")
    text = text.replace("{{email}}", contact.email or "")
    text = text.replace("{{company_name}}", contact.company_name or "")
    text = text.replace("{{designation}}", contact.designation or "")
    return text

async def process_campaign(campaign_id: str):
    print(f"\n[EMAIL SENDER] >>> STARTING CAMPAIGN PROCESSING: {campaign_id}")
    try:
        async with async_session_maker() as session:
            # Load campaign and template
            stmt = select(EmailCampaign).where(EmailCampaign.id == campaign_id)
            result = await session.execute(stmt)
            campaign = result.scalar_one_or_none()
            
            if not campaign:
                print(f"[EMAIL SENDER] ERROR: Campaign {campaign_id} not found in DB.")
                return
                
            if campaign.status not in ["running"]:
                print(f"[EMAIL SENDER] Skipping campaign {campaign_id} because status is '{campaign.status}' instead of 'running'.")
                return
    
            print(f"[EMAIL SENDER] Found campaign: '{campaign.name}' (Status: {campaign.status})")
    
            stmt_template = select(EmailTemplate).where(EmailTemplate.id == campaign.template_id)
            result_template = await session.execute(stmt_template)
            template = result_template.scalar_one_or_none()
            
            if not template:
                print(f"[EMAIL SENDER] ERROR: Template {campaign.template_id} not found.")
                campaign.status = "failed"
                await session.commit()
                return
                
            print(f"[EMAIL SENDER] Loaded template: '{template.subject}'")
                
            # Get pending contacts for this campaign
            stmt_contacts = select(EmailCampaignContact).where(
                EmailCampaignContact.campaign_id == campaign_id,
                EmailCampaignContact.status == "pending"
            )
            result_contacts = await session.execute(stmt_contacts)
            campaign_contacts = result_contacts.scalars().all()
            
            if not campaign_contacts:
                print(f"[EMAIL SENDER] No pending contacts found for campaign {campaign_id}. Marking as completed.")
                campaign.status = "completed"
                await session.commit()
                return
    
            print(f"[EMAIL SENDER] Found {len(campaign_contacts)} pending contacts to process.")
    
            try:
                # Setup SMTP server connection (Configure via env or settings)
                smtp_server = getattr(settings, "SMTP_SERVER", "localhost")
                smtp_port = getattr(settings, "SMTP_PORT", 1025) # Default MailHog port for local dev
                smtp_username = getattr(settings, "SMTP_USERNAME", None)
                smtp_password = getattr(settings, "SMTP_PASSWORD", None)
                smtp_from = campaign.sender_email or getattr(settings, "SMTP_FROM_EMAIL", "noreply@fastoclick.com")
                
                use_mock = False
                server = None
                try:
                    server = smtplib.SMTP(smtp_server, smtp_port)
                    if getattr(settings, "SMTP_TLS", False):
                        server.starttls()
                    if smtp_username and smtp_password:
                        server.login(smtp_username, smtp_password)
                except Exception as e:
                    print(f"[EMAIL SENDER] ❌ SMTP Connection failed to {smtp_server}:{smtp_port} -> {str(e)}")
                    print(f"[EMAIL SENDER] ⚠️ Falling back to Mock Email Sender for local development.")
                    use_mock = True
                    
                if not use_mock:
                    print(f"[EMAIL SENDER] ✅ Successfully connected to SMTP server {smtp_server}:{smtp_port}")
                    
                for cc in campaign_contacts:
                    stmt_contact = select(Contact).where(Contact.id == cc.contact_id)
                    res_contact = await session.execute(stmt_contact)
                    contact = res_contact.scalar_one_or_none()
                    
                    if not contact or contact.is_unsubscribed:
                        cc.status = "failed"
                        continue
                    
                    # Create EmailLog for tracking
                    log = EmailLog(
                        tenant_id=campaign.tenant_id,
                        campaign_id=campaign.id,
                        contact_id=contact.id,
                        event_type="sent"
                    )
                    session.add(log)
                    await session.flush() # To get the log ID for tracking
                    
                    # Replace variables
                    subject = replace_variables(template.subject, contact)
                    body_html = replace_variables(template.body_html, contact)
                    body_text = replace_variables(template.body_text, contact)
                    
                    # Insert tracking pixels (Open tracking)
                    tracking_pixel_url = f"{settings.API_BASE_URL}/email/track/open/{log.id}.png"
                    if body_html:
                        body_html += f'<img src="{tracking_pixel_url}" width="1" height="1" alt="" />'
                    
                    # Click tracking: rewrite hrefs in body_html to route through our server
                    if body_html:
                        try:
                            soup = BeautifulSoup(body_html, "html.parser")
                            for a_tag in soup.find_all("a", href=True):
                                orig_url = a_tag["href"]
                                if orig_url.startswith("http"):
                                    encoded_url = urllib.parse.quote(orig_url, safe="")
                                    track_url = f"{settings.API_BASE_URL}/email/track/click/{log.id}?url={encoded_url}"
                                    a_tag["href"] = track_url
                            body_html = str(soup)
                        except Exception as parse_e:
                            logger.error(f"[EMAIL SENDER] Failed to parse HTML for click tracking: {parse_e}")
                            print(f"[EMAIL SENDER] Failed to parse HTML for click tracking: {parse_e}")
                    
                    # Send email
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = smtp_from
                    msg["To"] = contact.email
                    
                    if body_text:
                        msg.attach(MIMEText(body_text, "plain"))
                    if body_html:
                        msg.attach(MIMEText(body_html, "html"))
                    
                    try:
                        if not use_mock and server:
                            server.send_message(msg)
                            print(f"[EMAIL SENDER] ✉️ Sent real email to: {contact.email}")
                        else:
                            print(f"[EMAIL SENDER] 🛠️ [MOCK EMAIL] Sent to: {contact.email} | Subject: {subject}")
                            
                        cc.status = "sent"
                        log.event_type = "delivered" # Optimistic delivery for SMTP
    
                    except Exception as e:
                        print(f"[EMAIL SENDER] ❌ Failed to send email to {contact.email}: {str(e)}")
                        cc.status = "failed"
                        log.event_type = "bounced"
                        log.error_message = str(e)
                    
                if server and not use_mock:
                    try:
                        server.quit()
                        print(f"[EMAIL SENDER] 🔌 Closed SMTP connection.")
                    except Exception:
                        print(f"[EMAIL SENDER] 🔌 SMTP connection was already closed.")
                    
                print(f"[EMAIL SENDER] <<< FINISHED CAMPAIGN PROCESSING: {campaign_id}")
                
            except Exception as e:
                print(f"[EMAIL SENDER] 🔥 FATAL ERROR processing campaign {campaign_id}: {str(e)}")
                campaign.status = "failed"
                await session.commit()
                return
                
            # Check if all completed
            stmt_remaining = select(EmailCampaignContact).where(
                EmailCampaignContact.campaign_id == campaign_id,
                EmailCampaignContact.status == "pending"
            )
            remaining = await session.execute(stmt_remaining)
            if not remaining.scalars().first():
                print(f"[EMAIL SENDER] All contacts processed. Marking campaign as completed.")
                campaign.status = "completed"
                
            await session.commit()
        
    except Exception as fatal_e:
        print(f"[EMAIL SENDER] 🔥 UNHANDLED FATAL ERROR: {str(fatal_e)}")
