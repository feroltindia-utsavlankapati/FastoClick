import asyncio
import httpx
import sys

async def main():
    async with httpx.AsyncClient() as client:
        print("Testing Signup...")
        try:
            signup_resp = await client.post("http://localhost:8001/auth/signup", json={
                "tenant_name": "Acme Corp",
                "username": "testuser",
                "email": "test@example.com",
                "password": "securepassword"
            })
            print("Signup Response:", signup_resp.status_code, signup_resp.text)
        except Exception as e:
            print(f"Error connecting to server. Is it running? {e}")
            return
            
        print("\nTesting Login...")
        login_resp = await client.post("http://localhost:8001/auth/login", json={
            "username": "testuser",
            "password": "securepassword"
        })
        print("Login Response:", login_resp.status_code, login_resp.text)
        
        if login_resp.status_code != 200:
            print("Login failed, aborting.")
            return
            
        token = login_resp.json()["data"]["access_token"]
        
        print("\nTesting Dashboard...")
        dash_resp = await client.get("http://localhost:8002/tenant/dashboard", headers={
            "Authorization": f"Bearer {token}"
        })
        print("Dashboard Response:", dash_resp.status_code, dash_resp.text)

if __name__ == "__main__":
    asyncio.run(main())
