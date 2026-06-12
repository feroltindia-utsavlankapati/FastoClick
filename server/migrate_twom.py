import sqlite3
import os
import uuid

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "marketing_os.db")

def generate_uuid():
    return str(uuid.uuid4())

def migrate():
    print(f"Connecting to database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Check if "Twom" workspace exists
    cursor.execute("SELECT id, tenant_id FROM projects WHERE name = 'Twom'")
    twom_project = cursor.fetchone()
    
    tenant_id = None
    if not twom_project:
        # We need a tenant_id. Let's find an existing one from users or tenants table
        cursor.execute("SELECT id FROM tenants LIMIT 1")
        tenant = cursor.fetchone()
        if tenant:
            tenant_id = tenant[0]
        else:
            tenant_id = generate_uuid()
            
        twom_id = generate_uuid()
        print(f"Creating 'Twom' workspace with id {twom_id} under tenant {tenant_id}...")
        cursor.execute("""
            INSERT INTO projects (id, tenant_id, name, description, status)
            VALUES (?, ?, ?, ?, ?)
        """, (twom_id, tenant_id, "Twom", "Migrated workspace for existing data", "active"))
    else:
        twom_id = twom_project[0]
        tenant_id = twom_project[1]
        print(f"Found 'Twom' workspace with id {twom_id}")

    # 2. Update existing data to use this project_id where project_id IS NULL or empty
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
        print(f"Updating data in {table} to belong to 'Twom' workspace...")
        try:
            cursor.execute(f"UPDATE {table} SET project_id = ? WHERE project_id IS NULL OR project_id = ''", (twom_id,))
            updated_rows = cursor.rowcount
            print(f"  -> Updated {updated_rows} rows in {table}.")
        except sqlite3.OperationalError as e:
            print(f"  -> Error updating {table}: {e}")

    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
