from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from .routes import login, oauth, tokens
from shared.clients.cgh_client import CGHClient
from shared.database import init_db
from shared.dependencies import verify_internal_access
import sys
import os

# Add the server directory to sys.path to allow absolute imports from 'shared'
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.cgh = await CGHClient.connect()
    # Initialize the database
    await init_db()
    yield
    # Shutdown
    pass

def create_app() -> FastAPI:
    app = FastAPI(
        title="Auth Service",
        version="1.0.0",
        lifespan=lifespan,
        dependencies=[Depends(verify_internal_access)]
    )
    
    app.include_router(login.router, prefix="/auth")
    app.include_router(oauth.router, prefix="/auth/oauth")
    app.include_router(tokens.router, prefix="/auth/tokens")
    return app

app = create_app()

