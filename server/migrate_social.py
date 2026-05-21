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

    # 1. social_platform_credentials
    print("Checking social_platform_credentials table...")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='social_platform_credentials'")
    if c.fetchone():
        print("  - Table 'social_platform_credentials' already exists.")
    else:
        c.execute("""
            CREATE TABLE social_platform_credentials (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                client_id_enc TEXT,
                client_secret_enc TEXT,
                app_id TEXT,
                additional_config_enc TEXT,
                redirect_uri TEXT,
                webhook_url TEXT,
                is_validated BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("CREATE INDEX ix_spc_tenant ON social_platform_credentials (tenant_id)")
        print("  - Created 'social_platform_credentials' table and index.")

    # 2. connected_social_accounts
    print("Checking connected_social_accounts table...")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='connected_social_accounts'")
    if c.fetchone():
        print("  - Table 'connected_social_accounts' already exists.")
    else:
        c.execute("""
            CREATE TABLE connected_social_accounts (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                platform_user_id TEXT,
                account_name TEXT,
                account_handle TEXT,
                profile_image_url TEXT,
                access_token_enc TEXT,
                refresh_token_enc TEXT,
                token_expires_at DATETIME,
                scopes TEXT,
                is_active BOOLEAN DEFAULT 1,
                last_synced_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("CREATE INDEX ix_csa_tenant ON connected_social_accounts (tenant_id)")
        print("  - Created 'connected_social_accounts' table and index.")

    # 3. scheduled_posts
    print("Checking scheduled_posts table...")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='scheduled_posts'")
    if c.fetchone():
        print("  - Table 'scheduled_posts' already exists.")
    else:
        c.execute("""
            CREATE TABLE scheduled_posts (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                product_id TEXT,
                caption TEXT,
                hashtags TEXT,
                mentions TEXT,
                link_url TEXT,
                media_ids TEXT,
                platform_account_ids TEXT,
                scheduled_at DATETIME,
                timezone TEXT DEFAULT 'UTC',
                status TEXT DEFAULT 'draft',
                recurrence_rule TEXT,
                parent_post_id TEXT,
                publish_log TEXT,
                platform_post_ids TEXT,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("CREATE INDEX ix_sp2_tenant ON scheduled_posts (tenant_id)")
        c.execute("CREATE INDEX ix_sp2_product ON scheduled_posts (product_id)")
        c.execute("CREATE INDEX ix_sp2_status ON scheduled_posts (status)")
        print("  - Created 'scheduled_posts' table and indexes.")

    # 4. media_assets
    print("Checking media_assets table...")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='media_assets'")
    if c.fetchone():
        print("  - Table 'media_assets' already exists.")
    else:
        c.execute("""
            CREATE TABLE media_assets (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                original_filename TEXT,
                mime_type TEXT,
                file_size_bytes INTEGER,
                file_path TEXT NOT NULL,
                thumbnail_path TEXT,
                width INTEGER,
                height INTEGER,
                duration_seconds REAL,
                metadata_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("CREATE INDEX ix_ma_tenant ON media_assets (tenant_id)")
        print("  - Created 'media_assets' table and index.")

    # 5. post_analytics
    print("Checking post_analytics table...")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='post_analytics'")
    if c.fetchone():
        print("  - Table 'post_analytics' already exists.")
    else:
        c.execute("""
            CREATE TABLE post_analytics (
                id TEXT PRIMARY KEY,
                post_id TEXT NOT NULL,
                platform TEXT NOT NULL,
                account_id TEXT,
                impressions INTEGER DEFAULT 0,
                reach INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                comments INTEGER DEFAULT 0,
                shares INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                engagement_rate REAL DEFAULT 0.0,
                video_views INTEGER DEFAULT 0,
                watch_time_seconds REAL DEFAULT 0.0,
                raw_data_json TEXT,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        c.execute("CREATE INDEX ix_pa_post ON post_analytics (post_id)")
        print("  - Created 'post_analytics' table and index.")

    conn.commit()
    conn.close()
    print("\nSocial media migration completed successfully!")


if __name__ == "__main__":
    run_migration()
