import asyncio
import httpx

async def test_update():
    async with httpx.AsyncClient() as client:
        # Login using correct JSON format
        login_res = await client.post("http://localhost:8000/auth/login", json={"username": "utsav007", "password": "utsav1424"})
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.text}")
            return
        
        token = login_res.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get projects
        proj_res = await client.get("http://localhost:8000/tenant/projects", headers=headers)
        projects = proj_res.json()
        if not projects:
            print("No projects found.")
            return
            
        project_id = projects[-1]["id"]
        print(f"Using project {project_id}")
        
        # Post to context using the hardcoded frontend tenantId ("demo-tenant")
        payload = {
            "tenant_id": "demo-tenant", 
            "project_id": project_id,
            "link": "",
            "focus": "",
            "product_details": "",
            "service_details": "",
            "company_details": ""
        }
        ctx_res = await client.post("http://localhost:8000/tenant/company/context", headers=headers, json=payload)
        print(f"Context POST: {ctx_res.status_code}")
        print(ctx_res.text)

if __name__ == "__main__":
    asyncio.run(test_update())
