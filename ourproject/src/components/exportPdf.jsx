import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportChatPDF(messages = [], me = "") {
  // Create main container with just the messages
  const mainContainer = document.createElement("div");
  mainContainer.style.position = "fixed";
  mainContainer.style.left = "-9999px";
  mainContainer.style.top = "-9999px";
  mainContainer.style.width = "600px";
  mainContainer.style.minHeight = "auto";
  mainContainer.style.background = "linear-gradient(180deg, #0b0b0d 0%, #0f0f12 100%)";
  mainContainer.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
  mainContainer.style.color = "#fff";
  mainContainer.style.padding = "20px";
  mainContainer.style.boxSizing = "border-box";
  mainContainer.style.margin = "0";

  // Chat preview container - matching exact CSS from view full chat modal
  const chatPreview = document.createElement("div");
  chatPreview.style.position = "relative";
  chatPreview.style.width = "100%";
  chatPreview.style.padding = "18px";
  chatPreview.style.background = "linear-gradient(180deg, #0b0b0d, #0f0f12)";
  chatPreview.style.borderRadius = "18px";
  chatPreview.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.02)";
  chatPreview.style.overflow = "hidden";

  // Messages container
  const messagesContainer = document.createElement("div");
  messagesContainer.style.display = "flex";
  messagesContainer.style.flexDirection = "column";
  messagesContainer.style.gap = "10px";

  // Render all messages with same styling as view full chat modal
  messages.forEach((msg, idx) => {
    const isMe = msg.sender === me;

    const chatRow = document.createElement("div");
    chatRow.style.display = "flex";
    chatRow.style.alignItems = "flex-end";
    chatRow.style.gap = "10px";
    chatRow.style.position = "relative";
    chatRow.style.justifyContent = isMe ? "flex-end" : "flex-start";
    chatRow.style.animation = `slideIn 0.3s ease-out ${idx * 30}ms backwards`;

    const bubble = document.createElement("div");
    bubble.style.maxWidth = "72%";
    bubble.style.padding = "14px 16px";
    bubble.style.borderRadius = "16px";
    bubble.style.wordWrap = "break-word";
    bubble.style.lineHeight = "1.4";
    bubble.style.position = "relative";
    bubble.style.fontSize = "14px";
    bubble.style.fontWeight = "500";

    if (isMe) {
      bubble.style.background = "linear-gradient(135deg, #ff5252 0%, #ff7043 25%, #ff8a3d 50%, #ffa726 75%, #ffb74d 100%)";
      bubble.style.boxShadow = "0 10px 28px rgba(255,102,64,0.25)";
      
      // Tail for me
      const tail = document.createElement("div");
      tail.style.position = "absolute";
      tail.style.right = "-6px";
      tail.style.bottom = "12px";
      tail.style.width = "12px";
      tail.style.height = "12px";
      tail.style.background = "rgba(255,89,121,0.12)";
      tail.style.borderRadius = "2px";
      tail.style.transform = "rotate(45deg)";
      bubble.appendChild(tail);
    } else {
      bubble.style.background = "linear-gradient(135deg, #ff6b4d 0%, #ff8a4d 25%, #ffa44d 50%, #ffbc4d 75%, #ffd04d 100%)";
      bubble.style.boxShadow = "0 8px 20px rgba(255,150,100,0.2)";
      
      // Tail for them
      const tail = document.createElement("div");
      tail.style.position = "absolute";
      tail.style.left = "-6px";
      tail.style.bottom = "12px";
      tail.style.width = "12px";
      tail.style.height = "12px";
      tail.style.background = "rgba(255,255,255,0.04)";
      tail.style.borderRadius = "2px";
      tail.style.transform = "rotate(45deg)";
      bubble.appendChild(tail);
    }

    // Sender name
    const senderName = document.createElement("div");
    senderName.style.fontWeight = "700";
    senderName.style.fontSize = "13px";
    senderName.style.marginBottom = "6px";
    senderName.textContent = msg.sender;

    // Message text
    const msgText = document.createElement("div");
    msgText.style.whiteSpace = "pre-wrap";
    msgText.style.wordBreak = "break-word";
    msgText.textContent = msg.message;

    // Timestamp
    const timestamp = document.createElement("div");
    timestamp.style.fontSize = "11px";
    timestamp.style.color = "rgba(255,255,255,0.6)";
    timestamp.style.marginTop = "8px";
    timestamp.textContent = msg.timestamp;

    bubble.appendChild(senderName);
    bubble.appendChild(msgText);
    bubble.appendChild(timestamp);

    chatRow.appendChild(bubble);
    messagesContainer.appendChild(chatRow);
  });

  chatPreview.appendChild(messagesContainer);
  mainContainer.appendChild(chatPreview);

  // Add animation styles
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    * {
      box-sizing: border-box;
    }
  `;
  mainContainer.appendChild(style);

  document.body.appendChild(mainContainer);

  try {
    // Convert to canvas
    const canvas = await html2canvas(mainContainer, {
      scale: 2,
      backgroundColor: "#0b0b0d",
      useCORS: true,
      logging: false,
      windowWidth: 600,
      windowHeight: mainContainer.scrollHeight,
      allowTaint: true,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    // Convert canvas to image first to preserve quality
    const fullImgData = canvas.toDataURL("image/png");

    let currentPosition = 0;
    let pageNum = 1;

    while (currentPosition < imgHeight) {
      if (pageNum > 1) {
        pdf.addPage();
      }

      const availableHeight = pageHeight;
      const sourceYRatio = currentPosition / imgHeight;
      const sourceHeightRatio = Math.min(availableHeight / imgHeight, 1 - sourceYRatio);

      // Calculate actual pixel positions on the original canvas
      const sourceY = sourceYRatio * canvas.height;
      const sourceHeight = sourceHeightRatio * canvas.height;

      // Create a proper crop of the image
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = sourceHeight;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceHeight,
        0,
        0,
        canvas.width,
        sourceHeight
      );

      const pageImgData = tempCanvas.toDataURL("image/png");
      const pageImgHeight = (tempCanvas.height * imgWidth) / tempCanvas.width;

      pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, pageImgHeight);

      currentPosition += availableHeight;
      pageNum++;
    }

    // Save PDF
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString().replace(/:/g, "-");
    pdf.save(`chat-export-${dateStr}-${timeStr}.pdf`);
  } finally {
    document.body.removeChild(mainContainer);
  }
}
