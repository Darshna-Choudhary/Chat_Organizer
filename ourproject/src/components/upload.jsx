import React, { useState } from "react";
import "./upload.css";

export default function Upload({ setMessages }) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileSize, setFileSize] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const fileInputRef = React.useRef(null);
  const xhrRef = React.useRef(null);
  const startTimeRef = React.useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const calculateSpeed = (bytes, timeElapsed) => {
    const seconds = timeElapsed / 1000;
    const bytesPerSecond = bytes / seconds;
    return formatFileSize(bytesPerSecond) + "/s";
  };

  const calculateTimeRemaining = (totalBytes, uploadedBytes, elapsedTime) => {
    const remainingBytes = totalBytes - uploadedBytes;
    const bytesPerMs = uploadedBytes / elapsedTime;
    const remainingMs = remainingBytes / bytesPerMs;
    const seconds = Math.round(remainingMs / 1000);
    
    if (seconds < 60) return `${seconds}s remaining`;
    const minutes = Math.round(seconds / 60);
    return `${minutes}m remaining`;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      fileInputRef.current.files = files;
      const event = { target: { files } };
      handleUpload(event);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setFileName(file.name);
    setFileSize(file.size);
    setProgress(0);
    setUploading(true);
    setUploadedBytes(0);
    setUploadSpeed(null);
    setTimeRemaining(null);
    startTimeRef.current = Date.now();

    const isZipFile = file.name.endsWith('.zip');

    try {
      // Upload to Flask with progress tracking
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          const elapsedTime = Date.now() - startTimeRef.current;
          
          setProgress(Math.round(percentComplete));
          setUploadedBytes(event.loaded);
          
          if (elapsedTime > 500) {
            setUploadSpeed(calculateSpeed(event.loaded, elapsedTime));
            setTimeRemaining(calculateTimeRemaining(event.total, event.loaded, elapsedTime));
          }
        }
      });

      const uploadRes = await new Promise((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (err) {
              reject(new Error("Failed to parse upload response"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"));
        });

        xhr.open("POST", "http://127.0.0.1:5000/upload");
        xhr.send(formData);
      });

      console.log("Uploaded:", uploadRes);

      // Parse from Flask
      setProgress(100);
      setUploading(false);
      setParsing(true);
      setUploadSpeed(null);
      setTimeRemaining(null);

      // Handle ZIP files with multiple chats
      if (isZipFile && uploadRes.is_zip) {
        const allMessages = [];
        
        // Parse all files from ZIP
        for (const fileInfo of uploadRes.file_ids) {
          const parsed = await fetch(
            `http://127.0.0.1:5000/parse/${fileInfo.file_id}`
          ).then((r) => r.json());
          
          console.log(`Parsed ${fileInfo.original_name}:`, parsed);
          
          if (parsed.messages) {
            allMessages.push(...parsed.messages);
          }
        }
        
        setMessages(allMessages);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Handle single TXT file
        const parsed = await fetch(
          `http://127.0.0.1:5000/parse/${uploadRes.file_id}`
        ).then((r) => r.json());

        console.log("Parsed:", parsed);

        setMessages(parsed.messages);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }

      setParsing(false);
      setProgress(0);
      setFileName(null);
      setFileSize(null);
      // Clear file input
      fileInputRef.current.value = "";
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Upload failed. Please try again.");
      setUploading(false);
      setParsing(false);
      setProgress(0);
      setUploadSpeed(null);
      setTimeRemaining(null);
    }
  };

  const handleCancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setUploading(false);
    setParsing(false);
    setProgress(0);
    setFileName(null);
    setFileSize(null);
    setUploadSpeed(null);
    setTimeRemaining(null);
    fileInputRef.current.value = "";
  };

  return (
    <div className="upload-container">
      <div className="upload-box">
        <h2 className="upload-title">Upload Chat File</h2>
        <p className="upload-subtitle">Supports up to 1GB • .txt or .zip format</p>

        {error && (
          <div className="alert alert-error">
            <span>{error}</span>
            <button
              className="alert-close"
              onClick={() => setError(null)}
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>✓ File uploaded and parsed successfully!</span>
            <button
              className="alert-close"
              onClick={() => setSuccess(false)}
              aria-label="Close success"
            >
              ✕
            </button>
          </div>
        )}

        <div className="upload-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            disabled={uploading || parsing}
            className="file-input"
            id="file-input"
            accept=".txt,.zip"
          />
          <label
            className={`upload-label ${isDragActive ? "drag-active" : ""}`}
            htmlFor="file-input"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="upload-icon">📁</div>
            <span className="upload-text">
              {uploading || parsing
                ? "Processing..."
                : isDragActive
                ? "Drop your file here!"
                : "Click to select file or drag and drop"}
            </span>
            {fileName && (
              <span className="file-name">{fileName}</span>
            )}
          </label>
          <button
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || parsing}
            type="button"
          >
            {uploading ? "Uploading..." : parsing ? "Parsing..." : "Choose File"}
          </button>
        </div>

        {(uploading || parsing) && (
          <div className="progress-section">
            <div className="progress-info">
              <span className="progress-label">
                {parsing ? "Parsing..." : "Uploading..."}
              </span>
              <span className="progress-percent">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progress}%`,
                  background:
                    progress === 100
                      ? "linear-gradient(90deg, #4caf50, #2e7d32)"
                      : "linear-gradient(90deg, #2196F3, #1976D2)",
                }}
              />
            </div>
            <div className="progress-details">
              <div className="progress-status">
                {parsing ? (
                  "Parsing chat messages..."
                ) : (
                  <>
                    <span>Uploading: {formatFileSize(uploadedBytes)} / {formatFileSize(fileSize)}</span>
                  </>
                )}
              </div>
              {uploading && (
                <div className="progress-stats">
                  {uploadSpeed && <span className="stat-item">⚡ {uploadSpeed}</span>}
                  {timeRemaining && <span className="stat-item">⏱️ {timeRemaining}</span>}
                </div>
              )}
            </div>
            {uploading && (
              <button
                className="cancel-button"
                onClick={handleCancel}
                type="button"
              >
                ✕ Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
