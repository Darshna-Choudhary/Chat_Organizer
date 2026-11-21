import { useChat } from './reader/useChat.js';
import { useAppearance } from './reader/useAppearance.js';
import { buildStyle } from './reader/themes.js';
import Reader from './reader/Reader.jsx';
import StartScreen from './reader/StartScreen.jsx';

export default function App() {
  const c = useChat();
  const look = useAppearance();
  const style = buildStyle(look.appearance);

  let screen;
  if (c.status === 'loading' || !look.loaded) screen = <div className="start"><p className="muted">Loading...</p></div>;
  else if (!c.chat) screen = <StartScreen onFile={c.loadFile} error={c.error} busy={c.status === 'parsing'} />;
  else {
    screen = (
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
        appearance={look.appearance}
        onAppearance={look.change}
        onResetAppearance={look.reset}
      />
    );
  }
  return <div className="app" style={style}>{screen}</div>;
}
