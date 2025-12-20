import sqlite3
import os

DB_PATH = "storage/chats.db"
os.makedirs("storage", exist_ok=True)

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message TEXT NOT NULL,
        date TEXT,
        time TEXT) 
    """)


    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_file_id
        ON messages (file_id)
    """)

    conn.commit()
    conn.close()
