import { useState } from 'react'
import Navbar from './components/navbar'
import Upload from './components/upload'
import ChatPreview from './components/ChatPreview'
import ExportChatPDF from "./components/exportPdf.jsx";
import './App.css'

function App() {

  const [messages, setMessages] = useState([]);
  const [me, setMe] = useState("");

  console.log("Messages:", messages);

  return (
    <>
      <Navbar />

      <div className="upload">
        {/* Upload section */}
        <Upload setMessages={setMessages} />
      </div>

      {/* Sender input */}
      <div className="sender-section">
        <label className="sender-label">Who are you in the chat?</label>
        <div className="sender-input-wrapper">
          <input
            type="text"
            placeholder="Enter your name..."
            value={me}
            onChange={(e) => setMe(e.target.value)}
            className="sender-input"
          />
        </div>
      </div>

      {/* Chat UI */}
      <ChatPreview messages={messages} me={me} />

      {/* PDF Export */}
      <div className="export-section">
        <div className="export-section">
  <ExportChatPDF messages={messages} me={me} />
</div>

      </div>
    </>
  )
}

export default App
