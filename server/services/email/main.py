from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from .routes import contacts, templates, campaigns, tracking
from .scheduler import start_scheduler, stop_scheduler
from shared.database import init_db
from shared.dependencies import verify_internal_access
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database
    await init_db()
    
    # Start APScheduler for emails
    await start_scheduler()
    
    yield
    
    # Stop APScheduler
    await stop_scheduler()

def create_app() -> FastAPI:
    app = FastAPI(
        title="Email Service",
        version="1.0.0",
        lifespan=lifespan,
    )
    
    # Internal routes (protected)
    app.include_router(contacts.router, prefix="/email/contacts", dependencies=[Depends(verify_internal_access)])
    app.include_router(templates.router, prefix="/email/templates", dependencies=[Depends(verify_internal_access)])
    app.include_router(campaigns.router, prefix="/email/campaigns", dependencies=[Depends(verify_internal_access)])
    
    # Public tracking routes (no internal access required)
    app.include_router(tracking.router, prefix="/email/track")
    
    return app

app = create_app()
