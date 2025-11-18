export default function ChatPreview({ messages, me }) {
  return (
    <div
      id="chat-preview"
      style={{
        width: "400px",
        margin: "0 auto",
        padding: "20px",
        background: "#e5ddd5",
        borderRadius: "10px",
        minHeight: "300px"
      }}
    >
      {messages.map((msg, idx) => {
        const isMe = msg.sender === me;

        return (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: isMe ? "flex-end" : "flex-start",
              marginBottom: "10px"
            }}
          >
            <div
              style={{
                maxWidth: "70%",
                padding: "10px",
                borderRadius: "10px",
                background: isMe ? "#d9fdd3" : "#fff",
                boxShadow: "0 1px 1px rgba(0,0,0,0.2)"
              }}
            >
              <b>{msg.sender}</b><br />
              {msg.message}
              <div style={{ fontSize: "10px", marginTop: "5px" }}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
