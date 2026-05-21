import sqlite3, json

conn = sqlite3.connect('marketing_os.db')
c = conn.cursor()

# Check what account d21cfe72 is
c.execute("SELECT id, platform, account_name, tenant_id FROM connected_social_accounts WHERE id='d21cfe72-f483-40b6-b05a-b2dd2b7f3e07'")
print("Account d21cfe72:", c.fetchall())

# Check the TWOM account
c.execute("SELECT id, platform, account_name, tenant_id FROM connected_social_accounts WHERE tenant_id='77db671b-5b44-4961-ac3c-963961ddb2f2'")
print("TWOM accounts:", c.fetchall())

# The fix: update the post's platform_account_ids to the correct account
correct_account_id = '2f281907-7e41-450c-a2b0-3f8cf7df0591'
new_account_ids = json.dumps([correct_account_id])
c.execute(
    "UPDATE scheduled_posts SET platform_account_ids=? WHERE id='085706d0-bb43-4b29-bbb1-f4a2a47eec17'",
    (new_account_ids,)
)
conn.commit()
print(f"\nFixed! Updated platform_account_ids to {new_account_ids}")

# Verify
c.execute("SELECT platform_account_ids FROM scheduled_posts WHERE id='085706d0-bb43-4b29-bbb1-f4a2a47eec17'")
print("After fix:", c.fetchall())
