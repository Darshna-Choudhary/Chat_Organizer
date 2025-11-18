import uuid
import os

UPLOAD_FOLDER = "storage/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def save_uploaded_file(file):
    file_id = str(uuid.uuid4())
    path = f"{UPLOAD_FOLDER}/{file_id}.txt"
    file.save(path)
    return file_id
