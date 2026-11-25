import { stats, dueCards, today } from './srs.js';

const DAY_MS = 864e5;
const WEEKS = 52;
const CELL = 12, GAP = 3;

export function renderHeatmap(container, byDay) {
  const now = today();
  const startDay = now - (WEEKS * 7 - 1);
  const startWeekday = new Date(startDay * DAY_MS).getDay();
  const gridStart = startDay - startWeekday;

  const cols = WEEKS + 1;
  const width  = cols * (CELL + GAP) + 30;
  const height = 7 * (CELL + GAP) + 30;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'heatmap');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'خريطة المراجعات خلال 52 أسبوعًا');

  const monthNames = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  let lastMonth = -1;
  for (let w = 0; w < cols; w++) {
    const d = new Date((gridStart + w * 7) * DAY_MS);
    const m = d.getMonth();
    if (m !== lastMonth) {
      lastMonth = m;
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', 30 + w * (CELL + GAP));
      t.setAttribute('y', 10);
      t.setAttribute('class', 'hm-month');
      t.textContent = monthNames[m];
      svg.appendChild(t);
    }
  }

  const dayLabels = ['', 'Lun', '', 'Mer', '', 'Ven', ''];
  dayLabels.forEach((lbl, i) => {
    if (!lbl) return;
    const t = document.createElementNS(ns, 'text');
    t.setAttribute('x', 0);
    t.setAttribute('y', 30 + i * (CELL + GAP) + CELL - 2);
    t.setAttribute('class', 'hm-day');
    t.textContent = lbl;
    svg.appendChild(t);
  });

  for (let w = 0; w < cols; w++) {
    for (let d = 0; d < 7; d++) {
      const dayNum = gridStart + w * 7 + d;
      if (dayNum > now) continue;
      const iso = new Date(dayNum * DAY_MS).toISOString().slice(0, 10);
      const data = byDay[iso];
      const count = data?.reviews || 0;
      const level = count === 0 ? 0
                  : count < 3  ? 1
                  : count < 8  ? 2
                  : count < 15 ? 3
                  : 4;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', 30 + w * (CELL + GAP));
      rect.setAttribute('y', 30 + d * (CELL + GAP));
      rect.setAttribute('width', CELL);
      rect.setAttribute('height', CELL);
      rect.setAttribute('rx', 2);
      rect.setAttribute('class', `hm-cell hm-l${level}`);
      rect.dataset.day = iso;
      rect.dataset.count = count;
      const title = document.createElementNS(ns, 'title');
      title.textContent = count
        ? `${iso} · ${count} révision${count > 1 ? 's' : ''}`
        : `${iso} · aucune révision`;
      rect.appendChild(title);
      svg.appendChild(rect);
    }
  }

  const legend = container.querySelector('.hm-legend');
  container.innerHTML = '';
  if (legend) container.appendChild(legend);
  container.appendChild(svg);
}

export function renderStats(container, cards) {
  const s = stats(cards, 30);
  const due = dueCards(cards).length;
  const totalCards = Object.keys(cards).length;

  container.innerHTML = `
    <div class="dash-grid">
      <div class="dash-card">
        <div class="dash-icon">🔥</div>
        <b>${s.streak}</b>
        <span>سلسلة حالية</span>
      </div>
      <div class="dash-card">
        <div class="dash-icon">🏆</div>
        <b>${s.best}</b>
        <span>أفضل سلسلة</span>
      </div>
      <div class="dash-card">
        <div class="dash-icon">📚</div>
        <b>${totalCards}</b>
        <span>آيات محفوظة</span>
      </div>
      <div class="dash-card">
        <div class="dash-icon">⏰</div>
        <b>${due}</b>
        <span>للمراجعة اليوم</span>
      </div>
      <div class="dash-card">
        <div class="dash-icon">🎯</div>
        <b>${s.accuracy}%</b>
        <span>دقة 30 يومًا</span>
      </div>
      <div class="dash-card">
        <div class="dash-icon">✍️</div>
        <b>${s.total}</b>
        <span>مراجعات 30 يومًا</span>
      </div>
    </div>
  `;
}