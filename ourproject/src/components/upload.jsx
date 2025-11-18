import React from "react";

export default function Upload({ setMessages }) {

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // upload to Flask
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData,
    }).then((r) => r.json());

    console.log("Uploaded:", uploadRes);

    // parse from Flask
    const parsed = await fetch(
      `http://127.0.0.1:5000/parse/${uploadRes.file_id}`
    ).then((r) => r.json());

    console.log("Parsed:", parsed);

    setMessages(parsed.messages);
  };

  return (
    <div style={{ padding: "20px" }}>
      <input type="file" onChange={handleUpload} />
    </div>
  );
}
