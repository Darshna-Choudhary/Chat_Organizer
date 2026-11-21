import { fmtDate, monthLabel } from './rows.js';

function monthKeys(first, last) {
  const out = [];
  let [y, m] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function level(count, max) {
  if (!count) return 0;
  const r = Math.sqrt(count / max);
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}

// Calendar heatmap: one block per month, one cell per day, shaded by message count.
export default function Heatmap({ index, onPick, onClose }) {
  if (!index.days.length) return null;
  const max = Math.max(...index.dayCount.values());
  const keys = monthKeys(index.days[0].slice(0, 7), index.days[index.days.length - 1].slice(0, 7));

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal heat" role="dialog" aria-label="Calendar" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>Busiest days</b>
          <button onClick={onClose} aria-label="Close">{'\u2715'}</button>
        </div>
        <div className="heat-grid">
          {keys.map((key) => {
            const [y, m] = key.split('-').map(Number);
            const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
            const offset = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
            const cells = [];
            for (let i = 0; i < offset; i++) cells.push(<span key={'o' + i} className="cell empty" />);
            for (let d = 1; d <= daysIn; d++) {
              const date = `${key}-${String(d).padStart(2, '0')}`;
              const count = index.dayCount.get(date) || 0;
              cells.push(
                <button
                  key={date}
                  className={`cell l${level(count, max)}`}
                  disabled={!count}
                  title={`${fmtDate(date)}: ${count} message${count === 1 ? '' : 's'}`}
                  onClick={() => onPick(index.dayFirst.get(date))}
                >
                  {d}
                </button>
              );
            }
            return (
              <div key={key} className="heat-month">
                <div className="heat-title">{monthLabel(key)}</div>
                <div className="heat-days">{cells}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
