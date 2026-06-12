from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Float
from sqlalchemy.sql import func
from shared.models.base import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Tenant(Base):
    __tablename__ = "tenants"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    plan = Column(String, default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    goals = Column(String, nullable=True)
    target_audience = Column(String, nullable=True)
    kpis = Column(String, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    profile_image_url = Column(String, nullable=True)
    timezone = Column(String, default="IST")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CompanyContext(Base):
    __tablename__ = "company_contexts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    link = Column(String, nullable=True)
    focus = Column(String, nullable=True)
    product_details = Column(String, nullable=True)
    service_details = Column(String, nullable=True)
    company_details = Column(String, nullable=True)
    extracted_document_text = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class StrategyPlan(Base):
    __tablename__ = "strategy_plans"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    product_id = Column(String, index=True, nullable=True)
    company_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    user_prompt = Column(Text, nullable=True)
    plan_json = Column(Text, nullable=False)   # full JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContentIdeasResult(Base):
    __tablename__ = "content_ideas_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    product_id = Column(String, index=True, nullable=True)
    plan_id = Column(String, index=True, nullable=True)   # FK-style ref to strategy_plans.id
    plan_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    result_json = Column(Text, nullable=False)  # full JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CompanyProduct(Base):
    __tablename__ = "company_products"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'product' or 'service'
    description = Column(Text, nullable=True)
    target_audience = Column(Text, nullable=True)
    features = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ─────────────────────────────────────────────────────────────
# Social Media Integration Models
# ─────────────────────────────────────────────────────────────

class SocialPlatformCredential(Base):
    """Developer API credentials per platform per tenant (encrypted)."""
    __tablename__ = "social_platform_credentials"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    platform = Column(String, nullable=False)  # meta, twitter, linkedin, youtube, tiktok, pinterest
    client_id_enc = Column(Text, nullable=True)  # encrypted
    client_secret_enc = Column(Text, nullable=True)  # encrypted
    app_id = Column(String, nullable=True)
    additional_config_enc = Column(Text, nullable=True)  # encrypted JSON
    redirect_uri = Column(String, nullable=True)
    webhook_url = Column(String, nullable=True)
    is_validated = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ConnectedSocialAccount(Base):
    """Individual connected social accounts via OAuth."""
    __tablename__ = "connected_social_accounts"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    platform = Column(String, nullable=False)
    platform_user_id = Column(String, nullable=True)
    account_name = Column(String, nullable=True)
    account_handle = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
    access_token_enc = Column(Text, nullable=True)  # encrypted
    refresh_token_enc = Column(Text, nullable=True)  # encrypted
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    scopes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ScheduledPost(Base):
    """Posts queued for publishing across social platforms."""
    __tablename__ = "scheduled_posts"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    product_id = Column(String, index=True, nullable=True)
    caption = Column(Text, nullable=True)
    hashtags = Column(Text, nullable=True)  # comma-separated
    mentions = Column(Text, nullable=True)  # comma-separated
    link_url = Column(String, nullable=True)
    media_ids = Column(Text, nullable=True)  # JSON array of MediaAsset IDs
    platform_account_ids = Column(Text, nullable=True)  # JSON array of ConnectedSocialAccount IDs
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    timezone = Column(String, default="UTC")
    status = Column(String, default="draft")  # draft, scheduled, publishing, published, failed, retry_pending
    recurrence_rule = Column(String, nullable=True)  # iCal RRULE
    parent_post_id = Column(String, nullable=True)  # for recurring series
    publish_log = Column(Text, nullable=True)  # JSON log of publishing attempts
    platform_post_ids = Column(Text, nullable=True)  # JSON: {platform: native_post_id}
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MediaAsset(Base):
    """Uploaded images and videos for social posts."""
    __tablename__ = "media_assets"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    project_id = Column(String, index=True, nullable=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    mime_type = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    file_path = Column(String, nullable=False)
    thumbnail_path = Column(String, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    duration_seconds = Column(Float, nullable=True)  # for video
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PostAnalytics(Base):
    """Per-post analytics snapshots fetched from platforms."""
    __tablename__ = "post_analytics"

    id = Column(String, primary_key=True, default=generate_uuid)
    post_id = Column(String, index=True, nullable=False)  # FK to scheduled_posts.id
    project_id = Column(String, index=True, nullable=True)
    platform = Column(String, nullable=False)
    account_id = Column(String, nullable=True)
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    video_views = Column(Integer, default=0)
    watch_time_seconds = Column(Float, default=0.0)
    raw_data_json = Column(Text, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())

