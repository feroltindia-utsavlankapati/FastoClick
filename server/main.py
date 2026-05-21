from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import subprocess
import sys
import os
import time
import httpx
from shared.config import get_settings

settings = get_settings()

processes = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting API Gateway & Microservices...")
    
    services = [
        {"name": "Auth Service", "module": "services.auth.main:app", "port": 8001},
        {"name": "Tenant Service", "module": "services.tenant.main:app", "port": 8002},
        {"name": "Agent Orchestrator Service", "module": "services.agent_orchestrator.main:app", "port": 8003},
        {"name": "Workflow Engine Service", "module": "services.workflow_engine.main:app", "port": 8004},
        {"name": "Social Service", "module": "services.social.main:app", "port": 8005},
    ]
    
    server_dir = os.path.dirname(os.path.abspath(__file__))
    
    for service in services:
        print(f"Starting {service['name']} on internal port {service['port']}...")
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", service["module"], "--port", str(service["port"])],
            cwd=server_dir
        )
        processes.append((service["name"], process))
        time.sleep(1)
        
    app.state.client = httpx.AsyncClient(timeout=300.0)
    yield
    
    print("\nShutting down all services...")
    await app.state.client.aclose()
    for name, process in processes:
        print(f"Terminating {name}...")
        process.terminate()
    for _, process in processes:
        process.wait()
    print("All services stopped.")

app = FastAPI(title="API Gateway", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def proxy_request(request: Request, port: int):
    client: httpx.AsyncClient = request.app.state.client
    url = httpx.URL(path=request.url.path, query=request.url.query.encode("utf-8"))
    
    # Forward headers but inject internal token
    headers = dict(request.headers)
    headers.pop("host", None) 
    headers.pop("content-length", None)
    headers["X-Internal-Token"] = settings.INTERNAL_SERVICE_TOKEN
    
    try:
        req = client.build_request(
            request.method,
            f"http://127.0.0.1:{port}{url}",
            headers=headers,
            content=await request.body()
        )
        response = await client.send(req)
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers={k: v for k, v in response.headers.items() if k.lower() != "content-encoding"}
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Bad Gateway: {str(e)}")

@app.api_route("/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def proxy_auth(request: Request, path: str):
    return await proxy_request(request, 8001)

@app.api_route("/tenant/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def proxy_tenant(request: Request, path: str):
    return await proxy_request(request, 8002)

@app.api_route("/agent/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def proxy_agent(request: Request, path: str):
    return await proxy_request(request, 8003)

@app.api_route("/workflow/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def proxy_workflow(request: Request, path: str):
    return await proxy_request(request, 8004)

@app.api_route("/social/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
async def proxy_social(request: Request, path: str):
    return await proxy_request(request, 8005)

if __name__ == "__main__":
    import uvicorn
    # Trigger auto-reload for updated route changes
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)