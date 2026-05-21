import asyncio
import httpx
import io

async def test_profile_flow():
    gateway_url = "http://localhost:8000"
    username = "test_profile_user"
    email = "profile_test@example.com"
    password = "securepassword"

    async with httpx.AsyncClient() as client:
        print("1. Signing up / Logging in test user...")
        # Try signing up
        try:
            signup_resp = await client.post(f"{gateway_url}/auth/signup", json={
                "tenant_name": "Test Profile Tenant",
                "username": username,
                "email": email,
                "password": password
            })
            print(f"Signup response: {signup_resp.status_code}")
        except Exception as e:
            print(f"Signup failed (user might exist): {e}")

        # Login
        login_resp = await client.post(f"{gateway_url}/auth/login", json={
            "username": username,
            "password": password
        })
        if login_resp.status_code != 200:
            print("Failed to login test user. Status:", login_resp.status_code)
            return

        token = login_resp.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        print("\n2. Fetching dashboard to inspect default user profile fields...")
        dash_resp = await client.get(f"{gateway_url}/tenant/dashboard", headers=headers)
        if dash_resp.status_code != 200:
            print("Failed to fetch dashboard. Status:", dash_resp.status_code)
            return
        
        dash_data = dash_resp.json()["data"]
        tenant_id = dash_data["tenant"]["id"]
        print("Default profile retrieved:")
        print(f"  Username: {dash_data['user']['username']}")
        print(f"  Email: {dash_data['user']['email']}")
        print(f"  Timezone: {dash_data['user']['timezone']}")
        print(f"  Profile Image URL: {dash_data['user']['profile_image_url']}")

        # Assert fields exist
        assert "timezone" in dash_data["user"]
        assert "profile_image_url" in dash_data["user"]

        print("\n3. Testing profile updates (Timezone: Asia/Kolkata + Uploading avatar)...")
        # Create a dummy 100-byte PNG file in-memory
        dummy_png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 92
        files = {
            "profile_image": ("avatar.png", io.BytesIO(dummy_png), "image/png")
        }
        data = {
            "timezone": "Asia/Kolkata"
        }

        profile_update_resp = await client.put(
            f"{gateway_url}/tenant/profile",
            headers=headers,
            data=data,
            files=files
        )
        print("Profile Update response:", profile_update_resp.status_code)
        if profile_update_resp.status_code != 200:
            print("Update failed:", profile_update_resp.text)
            return
        
        update_data = profile_update_resp.json()["data"]
        print("Updated User data returned:")
        print(f"  Timezone: {update_data['user']['timezone']}")
        print(f"  Profile Image URL: {update_data['user']['profile_image_url']}")

        assert update_data["user"]["timezone"] == "Asia/Kolkata"
        assert update_data["user"]["profile_image_url"] is not None

        avatar_url = update_data["user"]["profile_image_url"]

        print("\n4. Fetching dashboard again to confirm persistence...")
        dash_resp2 = await client.get(f"{gateway_url}/tenant/dashboard", headers=headers)
        dash_data2 = dash_resp2.json()["data"]
        print(f"  Persistent Timezone: {dash_data2['user']['timezone']}")
        print(f"  Persistent Profile Image URL: {dash_data2['user']['profile_image_url']}")
        assert dash_data2["user"]["timezone"] == "Asia/Kolkata"
        assert dash_data2["user"]["profile_image_url"] == avatar_url

        print("\n5. Testing served avatar download...")
        # Since it is a relative url or absolute url, fetch it directly
        avatar_resp = await client.get(avatar_url)
        print("Avatar serve response status:", avatar_resp.status_code)
        assert avatar_resp.status_code == 200
        print(f"Successfully downloaded {len(avatar_resp.content)} bytes of served profile picture.")

        print("\n6. Testing post creation default timezone fallback logic...")
        # Post creation payload without timezone specified
        post_payload = {
            "tenant_id": tenant_id,
            "caption": "Testing automatic profile timezone resolution fallback!",
            "scheduled_at": "2026-06-01T10:00:00"
        }

        post_create_resp = await client.post(
            f"{gateway_url}/social/posts",
            headers=headers,
            json=post_payload
        )
        print("Post creation response:", post_create_resp.status_code)
        if post_create_resp.status_code != 200:
            print("Post creation failed:", post_create_resp.text)
            return
        
        post_id = post_create_resp.json()["data"]["id"]
        print(f"Created Post ID: {post_id}")

        print("\n7. Fetching post details to assert fallback timezone...")
        post_detail_resp = await client.get(
            f"{gateway_url}/social/posts/detail/{post_id}",
            headers=headers
        )
        print("Post detail response:", post_detail_resp.status_code)
        if post_detail_resp.status_code != 200:
            print("Failed to fetch post details:", post_detail_resp.text)
            return
        
        post_data = post_detail_resp.json()["data"]
        print(f"  Scheduled Post Timezone: {post_data['timezone']}")
        assert post_data["timezone"] == "Asia/Kolkata"

        print("\nALL TESTS COMPLETED SUCCESSFULLY! Profile picture upload, timezone settings, dynamic avatar serving, and post scheduling fallback all work seamlessly.")

if __name__ == "__main__":
    asyncio.run(test_profile_flow())
