import sqlite3

conn = sqlite3.connect("marketing_os.db")
c = conn.cursor()

# Delete the stale analytics rows that contain fake baseline data
c.execute("DELETE FROM post_analytics WHERE post_id='085706d0-bb43-4b29-bbb1-f4a2a47eec17'")
deleted = c.rowcount
conn.commit()
print(f"Deleted {deleted} stale analytics row(s) for the TWOM post.")
print("Now click 'Sync' or 'Clear & Resync' in the analytics page to fetch real Meta numbers.")
