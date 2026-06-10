import os
import sqlite3

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "marketing_os.db")
    print(f"Connecting to DB at: {db_path}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Create email_projects
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_projects (
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
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_email_projects_tenant_id ON email_projects (tenant_id)")
    print("Created email_projects table.")
    
    # 2. Create email_ideas
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS email_ideas (
            id VARCHAR PRIMARY KEY,
            tenant_id VARCHAR NOT NULL,
            project_id VARCHAR NOT NULL,
            concept TEXT NOT NULL,
            status VARCHAR DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_email_ideas_tenant_id ON email_ideas (tenant_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_email_ideas_project_id ON email_ideas (project_id)")
    print("Created email_ideas table.")

    # 3. Add columns to email_campaigns
    try:
        cursor.execute("ALTER TABLE email_campaigns ADD COLUMN type VARCHAR DEFAULT 'one-off'")
        print("Added 'type' column to email_campaigns")
    except sqlite3.OperationalError as e:
        print(f"Column 'type' might already exist: {e}")
        
    try:
        cursor.execute("ALTER TABLE email_campaigns ADD COLUMN automation_config_json TEXT")
        print("Added 'automation_config_json' column to email_campaigns")
    except sqlite3.OperationalError as e:
        print(f"Column 'automation_config_json' might already exist: {e}")
        
    try:
        cursor.execute("ALTER TABLE email_campaigns ADD COLUMN strategy_json TEXT")
        print("Added 'strategy_json' column to email_campaigns")
    except sqlite3.OperationalError as e:
        print(f"Column 'strategy_json' might already exist: {e}")
        
    conn.commit()
    conn.close()
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
