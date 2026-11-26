import { useEffect, useState } from 'react';
import './reader/fonts.js';
import { useChat } from './reader/useChat.js';
import { useAppearance } from './reader/useAppearance.js';
import { useMedia } from './reader/useMedia.js';
import { useWelcome } from './reader/useWelcome.js';
import { useVault } from './vault/useVault.js';
import { buildStyle } from './reader/themes.js';
import Reader from './reader/Reader.jsx';
import StartScreen from './reader/StartScreen.jsx';
import UnlockScreen from './reader/UnlockScreen.jsx';

export default function App() {
  const c = useChat();
  const look = useAppearance();
  const media = useMedia(c.chat);
  const welcome = useWelcome();

  // Opens the chat from a vault (an encrypted copy published next to the app). Returns true when ready.
  async function openFromVault(data) {
    const d = data.defaults || {};
    look.seed(d.appearance);
    welcome.seed(d.welcome);
    const ok = await c.loadSource(
      { chatText: data.chatText, chatName: data.chatName, title: d.title, settings: { ...(d.me && { me: d.me }), ...(d.openAt && { openAt: d.openAt }) } },
      data.dateOrder,
      { persist: false, keepSavedSettings: true }
    );
    if (ok) media.attachEntries(data.entries);
    return ok;
  }
  const vault = useVault({ onOpen: openFromVault, base: import.meta.env.BASE_URL });
  const inVault = vault.status !== 'none' && vault.status !== 'checking';

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5 * 60 * 1000); // 'Through the Day' follows the hour
    return () => clearInterval(id);
  }, []);
  // before unlocking, the lock screen wears the theme chosen when the vault was packed
  const lockLook = inVault && vault.status !== 'open' && vault.meta?.lockTheme ? { ...look.appearance, theme: vault.meta.lockTheme, wallpaper: { kind: 'theme' } } : look.appearance;
  const style = buildStyle(lockLook, now);

  const ready = look.loaded && welcome.loaded && vault.status !== 'checking';
  let screen;
  if (!ready) {
    screen = <div className="start"><p className="muted">Loading...</p></div>;
  } else if (inVault && vault.status !== 'open') {
    screen = <UnlockScreen meta={vault.meta} onUnlock={vault.unlock} busy={vault.status === 'working'} error={vault.error} />;
  } else if (inVault && !c.chat) {
    screen = <div className="start"><p className="muted">Opening...</p></div>;
  } else if (c.status === 'loading') {
    screen = <div className="start"><p className="muted">Loading...</p></div>;
  } else if (!c.chat) {
    screen = <StartScreen onOpen={async (src, order) => { if (await c.loadSource(src, order)) await media.adopt(src); }} error={c.error} busy={c.status === 'parsing'} />;
  } else {
    screen = (
      <Reader
        key={c.chat.id}
        chat={c.chat}
        settings={c.settings}
        onSettings={c.updateSettings}
        onSavePosition={c.savePosition}
        onReplace={c.replaceChat}
        onForget={async () => { await c.forget(); await media.clear(); }}
        banner={c.banner}
        onDismissBanner={c.dismissBanner}
        appearance={look.appearance}
        onAppearance={look.change}
        onResetAppearance={look.reset}
        welcome={welcome.welcome}
        onWelcome={welcome.change}
        openWithWelcome={welcome.showOnOpen}
        onWelcomeStart={welcome.markSeen}
        vault={inVault ? { onLock: vault.lock } : null}
        media={{ store: media.store, status: media.status, error: media.error, info: media.info, showBanner: media.showBanner, onAttach: media.attach, onReconnect: media.reconnect, onDismissBanner: media.dismissBanner }}
      />
    );
  }
  return <div className="app" style={style}>{screen}</div>;
}
