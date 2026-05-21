import sqlite3, json

conn = sqlite3.connect('marketing_os.db')
c = conn.cursor()

TWOM = '77db671b-5b44-4961-ac3c-963961ddb2f2'

print("=== TWOM Tenant Posts ===")
c.execute("SELECT id, status, platform_post_ids, platform_account_ids FROM scheduled_posts WHERE tenant_id=?", (TWOM,))
posts = c.fetchall()
for row in posts:
    print(f"  post_id={row[0]}, status={row[1]}")
    print(f"    platform_ids={row[2]}")
    print(f"    account_ids={row[3]}")

print()
print("=== Analytics for TWOM posts ===")
post_ids = [p[0] for p in posts]
if post_ids:
    placeholders = ','.join('?' for _ in post_ids)
    c.execute(
        f"SELECT post_id, platform, impressions, reach, likes, engagement_rate, synced_at FROM post_analytics WHERE post_id IN ({placeholders}) ORDER BY synced_at DESC",
        post_ids
    )
    rows = c.fetchall()
    if rows:
        for r in rows:
            print(f"  {r}")
    else:
        print("  NO analytics rows found for TWOM!")
else:
    print("  No posts found for TWOM tenant!")

print()
print("=== Connected social accounts for TWOM ===")
c.execute("SELECT id, platform, account_name, account_handle FROM connected_social_accounts WHERE tenant_id=?", (TWOM,))
for r in c.fetchall():
    print(f"  {r}")
