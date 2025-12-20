from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import os

from database import init_db, get_db
from modules.parser import parse_chat

UPLOAD_FOLDER = "storage/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)

init_db()

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file"}), 400

    file = request.files["file"]
    file_id = str(uuid.uuid4())
    file.save(f"{UPLOAD_FOLDER}/{file_id}.txt")

    return jsonify({"file_id": file_id})


@app.route("/parse/<file_id>", methods=["POST"])
def parse_file(file_id):
    result = parse_chat(file_id)
    return jsonify(result)


@app.route("/messages/<file_id>")
def get_messages(file_id):
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 100))
    offset = (page - 1) * limit

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT sender, message, date, time
        FROM messages
        WHERE file_id = ?
        ORDER BY id ASC
        LIMIT ? OFFSET ?
        """, (file_id, limit, offset))

    rows = cursor.fetchall()
    conn.close()

    return jsonify({
        "messages": [dict(row) for row in rows],
        "has_more": len(rows) == limit
    })

@app.route("/jump/<file_id>")
def jump_to_date(file_id):
    date = request.args.get("date")

    if not date:
        return jsonify({"error": "date is required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id
        FROM messages
        WHERE file_id = ?
        AND date = ?
        ORDER BY id
        LIMIT 1
        """,
        (file_id, date)
    )

    row = cursor.fetchone()

    if not row:
        conn.close()
        return jsonify({
            "page": 1,
            "found": False,
            "reason": "date not found"
        })

    first_id = row["id"]

    cursor.execute(
        """
        SELECT COUNT(*) as count
        FROM messages
        WHERE file_id = ?
        AND id < ?
        """,
        (file_id, first_id)
    )

    count_row = cursor.fetchone()
    conn.close()

    offset = count_row["count"]
    limit = 100
    page = (offset // limit) + 1

    return jsonify({
        "page": page,
        "found": True
    })


if __name__ == "__main__":
    app.run(debug=True)
