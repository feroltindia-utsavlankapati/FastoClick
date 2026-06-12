from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from .routes import dashboard, company, projects
from shared.database import init_db
from shared.dependencies import verify_internal_access
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database
    await init_db()
    yield

def create_app() -> FastAPI:
    app = FastAPI(
        title="Tenant Service",
        version="1.0.0",
        lifespan=lifespan,
        dependencies=[Depends(verify_internal_access)]
    )
    
    app.include_router(dashboard.router, prefix="/tenant")
    app.include_router(company.router, prefix="/tenant/company")
    app.include_router(projects.router, prefix="/tenant/projects", tags=["Projects"])
    return app

app = create_app()
