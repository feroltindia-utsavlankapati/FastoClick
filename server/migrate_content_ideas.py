import sqlite3
db = r'c:\Utsav\ferolt\FastoClick\server\marketing_os.db'
conn = sqlite3.connect(db)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='content_ideas_results'")
if c.fetchone():
    print('Already exists.')
else:
    c.execute("""CREATE TABLE content_ideas_results (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        plan_id TEXT,
        plan_name TEXT,
        industry TEXT,
        result_json TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("CREATE INDEX ix_ci_tenant ON content_ideas_results (tenant_id)")
    c.execute("CREATE INDEX ix_ci_plan ON content_ideas_results (plan_id)")
    conn.commit()
    print("Created content_ideas_results table.")
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print([r[0] for r in c.fetchall()])
conn.close()
