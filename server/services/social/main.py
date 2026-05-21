"""
Social Media Microservice — FastAPI application entry point.
Follows the same pattern as tenant/main.py.
"""
from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from .routes import credentials, accounts, posts, media, analytics
from shared.database import init_db
from shared.dependencies import verify_internal_access
import sys
import os
import logging

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB and start the publishing scheduler on startup."""
    await init_db()

    # Start the APScheduler publishing engine
    from services.social.scheduler import start_scheduler, stop_scheduler
    start_scheduler()
    logger.info("Social Service started successfully")

    yield

    # Graceful shutdown
    stop_scheduler()
    logger.info("Social Service shut down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Social Media Service",
        description="Social media integration, scheduling, and analytics microservice",
        version="1.0.0",
        lifespan=lifespan,
        dependencies=[Depends(verify_internal_access)],
    )

    # Register all route sub-routers
    app.include_router(credentials.router, prefix="/social")
    app.include_router(accounts.router, prefix="/social")
    app.include_router(posts.router, prefix="/social")
    app.include_router(media.router, prefix="/social")
    app.include_router(analytics.router, prefix="/social")

    # AI assist routes (Phase 7)
    try:
        from .routes import ai_assist
        app.include_router(ai_assist.router, prefix="/social")
    except ImportError:
        logger.info("AI assist routes not available yet")

    return app


app = create_app()
