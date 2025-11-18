import os
import re
import json

UPLOAD_FOLDER = "storage/uploads"
PARSED_FOLDER = "storage/parsed"
os.makedirs(PARSED_FOLDER, exist_ok=True)

pattern = r"(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?:\s*[APap][mM])?)\s*-\s*(.+?):\s*(.*)"

def parse_chat(file_id):
    path = f"{UPLOAD_FOLDER}/{file_id}.txt"

    if not os.path.exists(path):
        return {"error": "File not found"}

    messages = []
    current = None

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            match = re.match(pattern, line)

            if match:
                if current:
                    messages.append(current)

                date, time, sender, text = match.groups()

                current = {
                    "sender": sender.strip(),
                    "message": text.strip(),
                    "timestamp": f"{date} {time}"
                }

            else:
                if current:
                    current["message"] += "\n" + line.strip()

    if current:
        messages.append(current)

    parsed_path = f"{PARSED_FOLDER}/{file_id}.json"
    with open(parsed_path, "w", encoding="utf-8") as out:
        json.dump({"messages": messages}, out, ensure_ascii=False, indent=2)

    return {"messages": messages}
