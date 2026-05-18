from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from shared.database import init_db
from shared.dependencies import verify_internal_access
from .routes import workflow_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    print("Workflow Engine Service started (in-process runner — no Temporal required).")
    yield
    print("Workflow Engine Service shutting down.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Workflow Engine Service",
        version="2.0.0",
        lifespan=lifespan,
        dependencies=[Depends(verify_internal_access)]
    )

    app.include_router(workflow_routes.router, prefix="/workflow")
    return app


app = create_app()
