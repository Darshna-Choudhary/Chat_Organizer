from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import zipfile
import uuid

from modules.upload import save_uploaded_file
from modules.parser import parse_chat

app = Flask(__name__)
CORS(app)

@app.route("/upload", methods=["POST"])
def upload_route():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    
    # Check if it's a ZIP file
    if file.filename.endswith('.zip'):
        return handle_zip_upload(file)
    else:
        file_id = save_uploaded_file(file)
        return jsonify({"file_id": file_id})


def handle_zip_upload(zip_file):
    """Handle ZIP file uploads containing multiple chat files"""
    try:
        # Create a temporary directory for extraction
        temp_dir = f"storage/temp/{uuid.uuid4()}"
        os.makedirs(temp_dir, exist_ok=True)
        
        # Save the ZIP file temporarily
        zip_path = os.path.join(temp_dir, "archive.zip")
        zip_file.save(zip_path)
        
        # Extract ZIP file
        extracted_files = []
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)
            
            # Find all .txt files in the extracted contents
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    if file.endswith('.txt'):
                        file_path = os.path.join(root, file)
                        extracted_files.append({
                            'name': file,
                            'path': file_path
                        })
        
        if not extracted_files:
            return jsonify({"error": "No .txt files found in ZIP"}), 400
        
        # Process all extracted files
        file_ids = []
        for extracted_file in extracted_files:
            file_id = str(uuid.uuid4())
            dest_path = f"storage/uploads/{file_id}.txt"
            
            # Copy extracted file to uploads folder
            with open(extracted_file['path'], 'r', encoding='utf-8', errors='ignore') as src:
                content = src.read()
            with open(dest_path, 'w', encoding='utf-8') as dst:
                dst.write(content)
            
            file_ids.append({
                'file_id': file_id,
                'original_name': extracted_file['name']
            })
        
        # Clean up temp directory
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        return jsonify({
            "file_ids": file_ids,
            "count": len(file_ids),
            "is_zip": True
        })
    
    except zipfile.BadZipFile:
        return jsonify({"error": "Invalid ZIP file"}), 400
    except Exception as e:
        return jsonify({"error": f"Error processing ZIP: {str(e)}"}), 400


@app.route("/parse/<file_id>", methods=["GET"])
def parse_route(file_id):
    result = parse_chat(file_id)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
