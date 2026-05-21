import asyncio
import httpx
import sys

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("--- Testing Auth Flow (Gateway Port 8000) ---")
        
        # 1. Signup / Login
        email = "test_social@example.com"
        username = "test_social_user"
        password = "securepassword"
        
        # Try login first in case account already exists
        print(f"Attempting login for '{username}'...")
        login_resp = await client.post("http://localhost:8000/auth/login", json={
            "username": username,
            "password": password
        })
        
        if login_resp.status_code != 200:
            print("Login failed, attempting signup...")
            signup_resp = await client.post("http://localhost:8000/auth/signup", json={
                "tenant_name": "Social Test Corp",
                "username": username,
                "email": email,
                "password": password
            })
            print("Signup Response:", signup_resp.status_code, signup_resp.text)
            
            login_resp = await client.post("http://localhost:8000/auth/login", json={
                "username": username,
                "password": password
            })
        
        print("Login Response:", login_resp.status_code)
        if login_resp.status_code != 200:
            print("Failed to authenticate.")
            return
            
        auth_data = login_resp.json()
        token = auth_data["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get tenant_id from dashboard
        dash_resp = await client.get("http://localhost:8000/tenant/dashboard", headers=headers)
        dash_data = dash_resp.json()
        tenant_id = dash_data["data"]["tenant"]["id"]
        
        print(f"Logged in successfully. Tenant ID: {tenant_id}")
        
        # 2. Connect Meta using mock manual token
        print("\n--- Connecting Meta with Manual Mock Token ---")
        mock_token = "mock_facebook_explorer_token_xyz"
        connect_payload = {
            "tenant_id": tenant_id,
            "platform": "meta",
            "token": mock_token
        }
        
        connect_resp = await client.post(
            "http://localhost:8000/social/accounts/connect-token",
            json=connect_payload,
            headers=headers
        )
        print("Connect Response:", connect_resp.status_code, connect_resp.text)
        
        if connect_resp.status_code != 200:
            print("Failed to connect manual token.")
            return
            
        connected_data = connect_resp.json()["data"]
        account_id = connected_data[0]["id"]
        print(f"Connected Facebook Page successfully! Account ID: {account_id}")
        
        # 3. List connected accounts to verify it is listed
        print("\n--- Listing Connected Accounts ---")
        list_resp = await client.get(
            f"http://localhost:8000/social/accounts/{tenant_id}",
            headers=headers
        )
        print("List Accounts Response:", list_resp.status_code, list_resp.text)
        
        # 4. Create a draft/scheduled post targeting this page
        print("\n--- Creating a Post to Publish ---")
        post_payload = {
            "tenant_id": tenant_id,
            "caption": "Testing Facebook page auto-posting from FastoClick!",
            "platform_account_ids": [account_id],
            "scheduled_at": None,  # Draft / immediate manual post
            "link_url": "https://fastoclick.com",
            "hashtags": "#social #marketing #automation",
            "mentions": "@fastoclick",
            "media_ids": []
        }
        
        create_resp = await client.post(
            "http://localhost:8000/social/posts",
            json=post_payload,
            headers=headers
        )
        print("Create Post Response:", create_resp.status_code, create_resp.text)
        
        if create_resp.status_code != 200:
            print("Failed to create post.")
            return
            
        post_id = create_resp.json()["data"]["id"]
        print(f"Post created successfully with ID: {post_id}")
        
        # 5. Trigger "Publish Now" inline
        print(f"\n--- Triggering Immediate Publishing ('Publish Now') for Post {post_id} ---")
        publish_resp = await client.post(
            f"http://localhost:8000/social/posts/{post_id}/publish-now",
            headers=headers
        )
        print("Publish Now Response:", publish_resp.status_code, publish_resp.text)
        
        # 6. Retrieve post to verify native platform post ID is saved
        print(f"\n--- Verifying Saved Post Analytics & Platform Post IDs ---")
        get_resp = await client.get(
            f"http://localhost:8000/social/posts/detail/{post_id}",
            headers=headers
        )
        print("Get Post Response:", get_resp.status_code, get_resp.text)
        
        post_info = get_resp.json()["data"]
        platform_post_ids = post_info.get("platform_post_ids", {})
        print("Saved Platform Post IDs:", platform_post_ids)
        
        if "meta" in platform_post_ids:
            print("\nSUCCESS: Meta platform post ID was captured and saved properly!")
        else:
            print("\nFAILURE: Meta platform post ID was not found in saved post.")

if __name__ == "__main__":
    asyncio.run(main())
