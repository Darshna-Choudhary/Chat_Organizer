// components/export-pdf/ExportChatPDF.jsx
import { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "./exportChatPDF.css";

export default function ExportChatPDF({ messages, me }) {
  const hiddenRef = useRef(null);

  const handleExport = async () => {
    const chatElement = hiddenRef.current;
    if (!chatElement) return;

    // Capture screenshot
    const canvas = await html2canvas(chatElement, {
      scale: 2,
      backgroundColor: "#0b0b0d",
      useCORS: true,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    pdf.save(`chat-export-${dateStr}.pdf`);
  };

  return (
    <>
      {/* Hidden DOM for PDF */}
      <div className="pdf-chat-container" ref={hiddenRef}>
        <div className="pdf-messages">
          {messages.map((msg, idx) => {
            const isMe = msg.sender === me;

            return (
              <div
                key={idx}
                className={`pdf-chat-row ${isMe ? "pdf-me" : "pdf-them"}`}
              >
                <div className={`pdf-bubble ${isMe ? "pdf-me" : "pdf-them"}`}>
                  <div className="pdf-sender">{msg.sender}</div>
                  <div className="pdf-text">{msg.message}</div>
                  <div className="pdf-timestamp">{msg.timestamp}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trigger button */}
      <button className="upload-button" onClick={handleExport} disabled={!messages.length}>
        📥 Export PDF
      </button>
    </>
  );
}
