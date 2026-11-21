import { useChat } from './reader/useChat.js';
import Reader from './reader/Reader.jsx';
import StartScreen from './reader/StartScreen.jsx';

// The old upload/Flask flow (components/upload.jsx, ChatPreview.jsx, ...) is legacy and no longer used here.
export default function App() {
  const c = useChat();

  if (c.status === 'loading') return <div className="start"><p className="muted">Loading...</p></div>;
  if (!c.chat) return <StartScreen onFile={c.loadFile} error={c.error} busy={c.status === 'parsing'} />;
  return (
    <Reader
      key={c.chat.id}
      chat={c.chat}
      settings={c.settings}
      onSettings={c.updateSettings}
      onSavePosition={c.savePosition}
      onReplace={c.replaceChat}
      onForget={c.forget}
      banner={c.banner}
      onDismissBanner={c.dismissBanner}
    />
  );
}
