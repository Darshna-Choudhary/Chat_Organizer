from flask import Flask, request, jsonify
from flask_cors import CORS
import os

from modules.upload import save_uploaded_file
from modules.parser import parse_chat

app = Flask(__name__)
CORS(app)

@app.route("/upload", methods=["POST"])
def upload_route():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    file_id = save_uploaded_file(file)
    return jsonify({"file_id": file_id})


@app.route("/parse/<file_id>", methods=["GET"])
def parse_route(file_id):
    result = parse_chat(file_id)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
