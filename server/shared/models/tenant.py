from sqlalchemy import Column, String, Boolean, DateTime, Text
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

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class CompanyContext(Base):
    __tablename__ = "company_contexts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, unique=True, index=True, nullable=False)
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
    company_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    user_prompt = Column(Text, nullable=True)
    plan_json = Column(Text, nullable=False)   # full JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ContentIdeasResult(Base):
    __tablename__ = "content_ideas_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    tenant_id = Column(String, index=True, nullable=False)
    plan_id = Column(String, index=True, nullable=True)   # FK-style ref to strategy_plans.id
    plan_name = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    result_json = Column(Text, nullable=False)  # full JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now())
