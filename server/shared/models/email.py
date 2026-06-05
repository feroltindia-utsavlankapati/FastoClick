from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float, ForeignKey
from sqlalchemy.sql import func
from shared.models.base import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Contact(Base):
    __tablename__ = "email_contacts"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, index=True, nullable=False)
    company_name = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    custom_fields_json = Column(Text, nullable=True)
    is_unsubscribed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body_html = Column(Text, nullable=True)
    body_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True) # E.g., Product ID or Campaign Group
    name = Column(String, nullable=False)
    template_id = Column(String, index=True, nullable=False)
    sender_email = Column(String, nullable=True) # The "From" email address
    status = Column(String, default="draft") # draft, scheduled, running, completed, failed
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class EmailCampaignContact(Base):
    __tablename__ = "email_campaign_contacts"

    id = Column(String, primary_key=True, default=generate_uuid)
    campaign_id = Column(String, index=True, nullable=False)
    contact_id = Column(String, index=True, nullable=False)
    status = Column(String, default="pending") # pending, sent, failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    campaign_id = Column(String, index=True, nullable=True)
    contact_id = Column(String, index=True, nullable=True)
    event_type = Column(String, nullable=False) # sent, delivered, opened, clicked, bounced, unsubscribed
    url_clicked = Column(Text, nullable=True) # If event_type is 'clicked'
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
