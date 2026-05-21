import sqlite3, json

conn = sqlite3.connect("marketing_os.db")
c = conn.cursor()

PAGE_ACCESS_TOKEN = "EAATNGIyBeN0BRkVSgZC1ZA6C7mHxsKPHuTKUXJqAkdc51A60ZA3LidgUwfpHZC80TifpBYtfANh0p75Frq5xK51lJaZC0CEpbUyK85YoZCZATZB0lGbRBvLb12gc9vRA4Kupve5ytdj1Ls82toIG6PPR9ZA7SqaNKZBd4lF6xsEJt6BQsz6hHD87086KvW6ZA7HsefadTRmEC67Edyn4yhZAqZB3r9crwPqswBoR3fe4wowQLVtvLcR1HXO39cqMoYKeT"
PAGE_ID = "1212090475311383"
ACCOUNT_ID = "2f281907-7e41-450c-a2b0-3f8cf7df0591"

# Check current state
c.execute("SELECT id, platform, account_name, platform_user_id FROM connected_social_accounts WHERE id=?", (ACCOUNT_ID,))
print("Current account:", c.fetchall())

# We need to store the Page access token (NOT user token) for this account
# First check if there's a token encryption function or if it's stored plain
c.execute("SELECT access_token_enc FROM connected_social_accounts WHERE id=?", (ACCOUNT_ID,))
row = c.fetchone()
if row:
    print("Current token_enc (first 40 chars):", str(row[0])[:40] if row[0] else "None")

# Also verify the post is using the right account
c.execute("SELECT platform_account_ids, platform_post_ids FROM scheduled_posts WHERE id='085706d0-bb43-4b29-bbb1-f4a2a47eec17'")
print("Post accounts:", c.fetchall())

# Update platform_user_id to the actual page ID
c.execute(
    "UPDATE connected_social_accounts SET platform_user_id=? WHERE id=?",
    (PAGE_ID, ACCOUNT_ID)
)
conn.commit()
print(f"Updated platform_user_id to {PAGE_ID} for account {ACCOUNT_ID}")
