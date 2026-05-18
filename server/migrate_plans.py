import sqlite3

db_path = r'c:\Utsav\ferolt\FastoClick\server\marketing_os.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== strategy_plans ===")
cursor.execute("SELECT id, tenant_id, company_name, industry, substr(plan_json,1,80), created_at FROM strategy_plans")
rows = cursor.fetchall()
if rows:
    for r in rows:
        print(r)
else:
    print("  (empty — no rows saved yet)")

print("\n=== tenants ===")
cursor.execute("SELECT id, name, plan FROM tenants")
for r in cursor.fetchall():
    print(r)

print("\n=== users ===")
cursor.execute("SELECT id, tenant_id, username, email FROM users")
for r in cursor.fetchall():
    print(r)

conn.close()
