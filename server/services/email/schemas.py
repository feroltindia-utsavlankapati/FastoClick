from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class ContactBase(BaseModel):
    project_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: EmailStr
    company_name: Optional[str] = None
    designation: Optional[str] = None
    phone_number: Optional[str] = None
    custom_fields_json: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: str
    tenant_id: str
    project_id: Optional[str]
    is_unsubscribed: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateResponse(EmailTemplateBase):
    id: str
    tenant_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmailCampaignBase(BaseModel):
    project_id: Optional[str] = None
    name: str
    template_id: str
    sender_email: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class EmailCampaignCreate(EmailCampaignBase):
    contact_ids: List[str]

class EmailCampaignResponse(EmailCampaignBase):
    id: str
    tenant_id: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmailLogResponse(BaseModel):
    id: str
    tenant_id: str
    campaign_id: Optional[str]
    contact_id: Optional[str]
    event_type: str
    url_clicked: Optional[str]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class CampaignAnalyticsResponse(BaseModel):
    total_sent: int
    total_delivered: int
    total_opened: int
    total_clicked: int
    total_bounced: int
    total_unsubscribed: int
