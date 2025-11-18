import { useState } from 'react'
import Navbar from './components/navbar'
import Upload from './components/upload'
import ChatPreview from './components/ChatPreview'
import { exportChatPDF } from './components/exportPdf'

function App() {

  const [messages, setMessages] = useState([]);
  const [me, setMe] = useState("");

  console.log("Messages:", messages);

  return (
    <>
      <Navbar />

      {/* Upload section */}
      <Upload setMessages={setMessages} />

      {/* Sender input */}
      <div style={{ padding: "20px" }}>
        <input
          type="text"
          placeholder="Who are you in the chat?"
          value={me}
          onChange={(e) => setMe(e.target.value)}
        />
      </div>

      {/* Chat UI */}
      <ChatPreview messages={messages} me={me} />

      {/* PDF Export */}
      <div style={{ padding: "20px" }}>
        <button onClick={exportChatPDF}>Export PDF</button>
      </div>
    </>
  )
}

export default App
