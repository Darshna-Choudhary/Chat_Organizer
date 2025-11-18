import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export async function exportChatPDF() {
  const chatElement = document.getElementById("chat-preview");
  const canvas = await html2canvas(chatElement, { scale: 2 });
  const img = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(img, "PNG", 0, 0, width, height);
  pdf.save("chat.pdf");
}
