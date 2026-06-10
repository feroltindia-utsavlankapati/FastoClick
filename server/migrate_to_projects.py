import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "marketing_os.db")

def migrate():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Create Projects table
    print("Creating projects table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR PRIMARY KEY,
        tenant_id VARCHAR NOT NULL,
        name VARCHAR NOT NULL,
        description TEXT,
        goals TEXT,
        target_audience TEXT,
        kpis TEXT,
        status VARCHAR DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id)")

    # 2. Migrate data from email_projects to projects
    print("Migrating existing email projects to global projects...")
    try:
        cursor.execute("SELECT id, tenant_id, name, description, goals, target_audience, kpis, status, created_at, updated_at FROM email_projects")
        email_projects = cursor.fetchall()
        for ep in email_projects:
            # Check if exists
            cursor.execute("SELECT id FROM projects WHERE id = ?", (ep[0],))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO projects (id, tenant_id, name, description, goals, target_audience, kpis, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, ep)
        print(f"Migrated {len(email_projects)} projects.")
    except sqlite3.OperationalError as e:
        print(f"Skipping email_projects migration (table might not exist or be empty): {e}")

    # 3. Add project_id column to tables
    tables_to_update = [
        "company_contexts",
        "strategy_plans",
        "content_ideas_results",
        "company_products",
        "social_platform_credentials",
        "connected_social_accounts",
        "scheduled_posts",
        "media_assets",
        "post_analytics",
        "email_contacts",
        "email_templates"
    ]

    for table in tables_to_update:
        print(f"Adding project_id to {table}...")
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN project_id VARCHAR")
            cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_{table}_project_id ON {table}(project_id)")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"  project_id already exists in {table}.")
            else:
                print(f"  Error adding to {table}: {e}")

    # We shouldn't drop email_projects just yet until we're sure the frontend uses projects
    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
