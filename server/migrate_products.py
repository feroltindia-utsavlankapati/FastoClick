import sqlite3
import os

DB_PATH = r"c:\Utsav\ferolt\FastoClick\server\marketing_os.db"

def run_migration():
    print(f"Connecting to database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("Database file does not exist yet. No migration needed.")
        return
        
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # 1. Create company_products table
    print("Checking company_products table...")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='company_products'")
    if c.fetchone():
        print("  - Table 'company_products' already exists.")
    else:
        c.execute("""
            CREATE TABLE company_products (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL, -- 'product' or 'service'
                description TEXT,
                target_audience TEXT,
                features TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("CREATE INDEX ix_cp_tenant ON company_products (tenant_id)")
        print("  - Created 'company_products' table and index.")
        
    # 2. Add product_id to strategy_plans
    print("Checking 'product_id' in strategy_plans...")
    c.execute("PRAGMA table_info(strategy_plans)")
    columns = [col[1] for col in c.fetchall()]
    if "product_id" in columns:
        print("  - Column 'product_id' already exists in strategy_plans.")
    else:
        c.execute("ALTER TABLE strategy_plans ADD COLUMN product_id TEXT")
        c.execute("CREATE INDEX ix_sp_product ON strategy_plans (product_id)")
        print("  - Added 'product_id' column and index to strategy_plans.")
        
    # 3. Add product_id to content_ideas_results
    print("Checking 'product_id' in content_ideas_results...")
    c.execute("PRAGMA table_info(content_ideas_results)")
    columns = [col[1] for col in c.fetchall()]
    if "product_id" in columns:
        print("  - Column 'product_id' already exists in content_ideas_results.")
    else:
        c.execute("ALTER TABLE content_ideas_results ADD COLUMN product_id TEXT")
        c.execute("CREATE INDEX ix_ci_product ON content_ideas_results (product_id)")
        print("  - Added 'product_id' column and index to content_ideas_results.")
        
    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
