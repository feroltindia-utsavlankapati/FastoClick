import asyncio
import sqlite3

def fix_db():
    conn = sqlite3.connect("marketing_os.db")
    cursor = conn.cursor()
    
    # 1. Create a new table without the UNIQUE constraint on tenant_id
    cursor.execute("""
    CREATE TABLE company_contexts_new (
        id VARCHAR NOT NULL, 
        tenant_id VARCHAR NOT NULL, 
        project_id VARCHAR, 
        link VARCHAR, 
        focus VARCHAR, 
        product_details VARCHAR, 
        service_details VARCHAR, 
        company_details VARCHAR, 
        extracted_document_text VARCHAR, 
        created_at DATETIME DEFAULT (CURRENT_TIMESTAMP), 
        updated_at DATETIME, 
        PRIMARY KEY (id)
    )
    """)
    
    # 2. Copy data
    cursor.execute("INSERT INTO company_contexts_new SELECT * FROM company_contexts")
    
    # 3. Drop old table
    cursor.execute("DROP TABLE company_contexts")
    
    # 4. Rename new table
    cursor.execute("ALTER TABLE company_contexts_new RENAME TO company_contexts")
    
    # 5. Recreate indexes
    cursor.execute("CREATE INDEX ix_company_contexts_project_id ON company_contexts (project_id)")
    cursor.execute("CREATE INDEX ix_company_contexts_tenant_id ON company_contexts (tenant_id)")
    
    conn.commit()
    conn.close()
    print("Database schema fixed.")

if __name__ == "__main__":
    fix_db()
