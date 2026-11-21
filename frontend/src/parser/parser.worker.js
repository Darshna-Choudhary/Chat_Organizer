// Web Worker wrapper so a large chat never freezes the page.
import { parseChat } from './parseChat.js';

self.onmessage = (event) => {
  const { text, options } = event.data;
  try {
    self.postMessage({ ok: true, result: parseChat(text, options) });
  } catch (err) {
    self.postMessage({ ok: false, error: String((err && err.message) || err) });
  }
};
