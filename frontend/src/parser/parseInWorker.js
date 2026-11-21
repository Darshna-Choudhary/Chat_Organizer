// Main-thread helpers. The chat text stays in the browser; nothing is sent anywhere.

export function parseChatInWorker(text, options = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./parser.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      worker.terminate();
      if (event.data.ok) resolve(event.data.result);
      else reject(new Error(event.data.error));
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'Parser worker failed'));
    };
    worker.postMessage({ text, options });
  });
}

export async function parseChatFile(file, options = {}) {
  const text = await file.text();
  return parseChatInWorker(text, options);
}
