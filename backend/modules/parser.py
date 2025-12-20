import os
import re
from database import get_db

UPLOAD_FOLDER = "storage/uploads"

pattern = r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}),?\s*(\d{1,2}:\d{2}(?:\s*[APap][mM])?)\s*-\s*(.+?):\s*([\s\S]*)"

def parse_chat(file_id):
    path = f"{UPLOAD_FOLDER}/{file_id}.txt"

    if not os.path.exists(path):
        return {"error": "File not found"}

    conn = get_db()
    cursor = conn.cursor()

    current = None
    batch = []
    BATCH_SIZE = 500

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.rstrip("\n")
            match = re.match(pattern, line)

            if match:
                if current:
                    batch.append(current)

                date, time, sender, text = match.groups()
                current = (file_id, sender.strip(), text.strip(), date, time)

                if len(batch) >= BATCH_SIZE:
                    cursor.executemany(
                        "INSERT INTO messages (file_id, sender, message, date, time) VALUES (?, ?, ?, ?, ?)",
                        batch
                    )
                    conn.commit()
                    batch.clear()

            else:
                if current:
                    current = (
                        current[0],
                        current[1],
                        current[2] + "\n" + line,
                        current[3],
                        current[4],
                    )

    if current:
        batch.append(current)

    if batch:
        cursor.executemany(
            "INSERT INTO messages (file_id, sender, message, date, time) VALUES (?, ?, ?, ?, ?)",
            batch
        )
        conn.commit()

    conn.close()
    return {"status": "parsed"}
