import './chatpreview.css';
import { useState } from 'react';

export default function ChatPreview({ messages, me }) {
  const [showFullChat, setShowFullChat] = useState(false);
  const PREVIEW_LIMIT = 5;
  const hasMore = messages.length > PREVIEW_LIMIT;
  const previewMessages = messages.slice(0, PREVIEW_LIMIT);
  const displayMessages = showFullChat ? messages : previewMessages;

  return (
    <>
      <div className="chat-preview-container">
        {messages.length > 0 ? (
          <>
            <div className="chat-preview-header">
              <h3>Chat Preview</h3>
              <span className="message-count">{messages.length} messages</span>
            </div>
            
            <div id="chat-preview" className="chat-preview">
              {previewMessages.map((msg, idx) => {
                const isMe = msg.sender === me;

                return (
                  <div key={idx} className={`chat-row ${isMe ? 'me' : 'them'}`}>
                    <div className={`chat-bubble ${isMe ? 'me' : 'them'} sender`}>
                      {msg.sender}
                      <br />
                      {msg.message}
                      <div className="chat-timestamp">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="preview-footer">
                <div className="more-messages">
                  +{messages.length - PREVIEW_LIMIT} more messages
                </div>
                <button 
                  className="view-all-button"
                  onClick={() => setShowFullChat(true)}
                >
                  View Full Chat →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>No messages yet. Upload a chat file to get started!</p>
          </div>
        )}
      </div>

      {/* Full Chat Modal */}
      {showFullChat && (
        <div className="full-chat-modal">
          <div className="full-chat-content">
            <div className="full-chat-header">
              <h2>Full Chat History</h2>
              <button 
                className="close-button"
                onClick={() => setShowFullChat(false)}
                aria-label="Close full chat view"
              >
                ✕
              </button>
            </div>

            <div className="full-chat-messages">
              {messages.map((msg, idx) => {
                const isMe = msg.sender === me;

                return (
                  <div key={idx} className={`chat-row ${isMe ? 'me' : 'them'}`}>
                    <div className={`chat-bubble ${isMe ? 'me' : 'them'} sender`}>
                      {msg.sender}
                      <br />
                      {msg.message}
                      <div className="chat-timestamp">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="full-chat-footer">
              <button 
                className="close-modal-button"
                onClick={() => setShowFullChat(false)}
              >
                ← Back to Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
