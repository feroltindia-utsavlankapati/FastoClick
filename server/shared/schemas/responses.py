from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, List
from datetime import datetime
import uuid

T = TypeVar("T")

class PaginationMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int

class ErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None
    pagination: Optional[PaginationMeta] = None
    request_id: str = str(uuid.uuid4())
    timestamp: datetime = datetime.utcnow()
