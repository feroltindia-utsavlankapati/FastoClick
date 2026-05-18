from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shared.database import init_db
from shared.dependencies import verify_internal_access
from .routes import agents, plans, content_ideas
from .registry import agent_registry

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database if needed
    await init_db()
    # Discover and register agents
    agents_dir = os.path.join(os.path.dirname(__file__), "agents")
    await agent_registry.auto_discover_and_register(agents_dir)
    yield

def create_app() -> FastAPI:
    app = FastAPI(
        title="Agent Orchestrator Service",
        version="1.0.0",
        lifespan=lifespan,
        dependencies=[Depends(verify_internal_access)]
    )
    
    app.include_router(agents.router, prefix="/agent")
    app.include_router(plans.router, prefix="/agent")
    app.include_router(content_ideas.router, prefix="/agent")
    return app

app = create_app()
