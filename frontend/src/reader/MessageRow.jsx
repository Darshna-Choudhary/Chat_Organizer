import { memo, useContext } from 'react';
import { fmtTime } from './rows.js';
import { MediaContext } from './MediaContext.js';
import MediaView from './MediaView.jsx';
import { mediaKind } from '../media/kinds.js';

const URL_SPLIT = /(https?:\/\/[^\s<]*[^\s<.,;:!?)"'\]])/g;

function nameColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 55% var(--name-l, 38%))`;
}

function highlight(text, query, keyBase) {
  if (!query) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.split(new RegExp('(' + esc + ')', 'ig')).map((part, i) =>
    i % 2 ? <mark key={keyBase + i}>{part}</mark> : part
  );
}

// Clickable links + search highlight. Text is rendered as plain text by React, never as HTML.
function renderText(text, query) {
  return text.split(URL_SPLIT).map((part, i) =>
    i % 2 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">
        {highlight(part, query, i + '-')}
      </a>
    ) : (
      <span key={i}>{highlight(part, query, i + '-')}</span>
    )
  );
}

function MessageRow({ m, first, isMe, showName, query, flashed }) {
  const { store } = useContext(MediaContext);
  const sticker = m.type === 'media' && !!m.mediaFile && mediaKind(m.mediaFile) === 'sticker' && !!store && store.has(m.mediaFile);
  let body;
  if (m.type === 'deleted') body = <i className="muted">{'\u{1F6AB} '}{m.text || 'This message was deleted'}</i>;
  else if (m.type === 'media' && m.mediaFile) {
    body = (
      <>
        <MediaView name={m.mediaFile} />
        {m.caption && <div className="caption">{renderText(m.caption, query)}</div>}
      </>
    );
  } else if (m.type === 'media') body = <span className="media">{'\u{1F4CE} '}Media omitted</span>;
  else body = renderText(m.text, query);

  return (
    <div className={`row ${isMe ? 'me' : 'them'}${first ? ' first' : ''}${flashed ? ' flash' : ''}`}>
      <div className={`bubble${sticker ? ' sticker' : ''}`}>
        {showName && <div className="name" style={{ color: nameColor(m.sender) }}>{m.sender}</div>}
        <span className="text">{body}</span>
        <span className="meta">{m.edited ? 'edited ' : ''}{m.time ? fmtTime(m.time) : ''}</span>
      </div>
    </div>
  );
}

export default memo(MessageRow);
