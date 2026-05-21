import asyncio, json, sys, os, logging
sys.path.insert(0, os.getcwd())
logging.basicConfig(level=logging.INFO, format='%(name)s - %(message)s')

TWOM = "77db671b-5b44-4961-ac3c-963961ddb2f2"

async def run():
    from shared.database import init_db
    await init_db()
    print("Initialized DB. Running sync...")
    from services.social.scheduler import sync_analytics_for_tenant
    await sync_analytics_for_tenant(TWOM)
    print("Sync complete. Checking DB...")

    import sqlite3
    conn = sqlite3.connect("marketing_os.db")
    c = conn.cursor()
    c.execute("SELECT post_id, platform, impressions, reach, likes, engagement_rate, synced_at FROM post_analytics WHERE post_id='085706d0-bb43-4b29-bbb1-f4a2a47eec17'")
    rows = c.fetchall()
    if rows:
        for r in rows:
            print("Analytics row:", r)
    else:
        print("STILL NO ANALYTICS ROWS!")

asyncio.run(run())
