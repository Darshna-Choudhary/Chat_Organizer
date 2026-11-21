import { useChat } from './reader/useChat.js';
import { useAppearance } from './reader/useAppearance.js';
import { useMedia } from './reader/useMedia.js';
import { buildStyle } from './reader/themes.js';
import Reader from './reader/Reader.jsx';
import StartScreen from './reader/StartScreen.jsx';

export default function App() {
  const c = useChat();
  const look = useAppearance();
  const media = useMedia(c.chat);
  const style = buildStyle(look.appearance);

  async function openSource(src, order) {
    if (await c.loadSource(src, order)) await media.adopt(src);
  }
  async function forgetAll() {
    await c.forget();
    await media.clear();
  }

  let screen;
  if (c.status === 'loading' || !look.loaded) screen = <div className="start"><p className="muted">Loading...</p></div>;
  else if (!c.chat) screen = <StartScreen onOpen={openSource} error={c.error} busy={c.status === 'parsing'} />;
  else {
    screen = (
      <Reader
        key={c.chat.id}
        chat={c.chat}
        settings={c.settings}
        onSettings={c.updateSettings}
        onSavePosition={c.savePosition}
        onReplace={c.replaceChat}
        onForget={forgetAll}
        banner={c.banner}
        onDismissBanner={c.dismissBanner}
        appearance={look.appearance}
        onAppearance={look.change}
        onResetAppearance={look.reset}
        media={{ store: media.store, status: media.status, error: media.error, info: media.info, showBanner: media.showBanner, onAttach: media.attach, onReconnect: media.reconnect, onDismissBanner: media.dismissBanner }}
      />
    );
  }
  return <div className="app" style={style}>{screen}</div>;
}
