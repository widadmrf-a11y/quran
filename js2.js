/* app.js — Enregistrement SW, install prompt, intégration dashboard */

// ---------- SERVICE WORKER ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(() => {
              nw.postMessage('SKIP_WAITING');
              window.location.reload();
            });
          }
        });
      });
    } catch (e) { console.warn('[SW] register failed', e); }
  });
}

function showUpdateBanner(onClick) {
  const b = document.createElement('div');
  b.className = 'update-banner';
  b.innerHTML = `✦ نسخة جديدة متاحة <button>تحديث</button>`;
  b.querySelector('button').onclick = onClick;
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 15000);
}

// ---------- INSTALL PROMPT ----------
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.hidden = false;
});
document.getElementById('installBtn')?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log('[PWA] install:', outcome);
  deferredPrompt = null;
  document.getElementById('installBtn').hidden = true;
});

// ---------- DASHBOARD ----------
(async () => {
  try {
    const { renderHeatmap, renderStats } = await import('./dashboard.js');
    const { stats } = await import('./srs.js');

    window.refreshDashboard = () => {
      const store = JSON.parse(localStorage.getItem('hifdh_v3') || '{}');
      const cards = store.m || {};
      const s = stats(cards, 365);
      const statsEl = document.getElementById('statsDash');
      const hmEl = document.getElementById('heatmapWrap');
      if (statsEl) renderStats(statsEl, cards);
      if (hmEl) renderHeatmap(hmEl, s.byDay);
    };

    // Rendu initial + mise à jour quand on revient sur l'onglet
    window.refreshDashboard();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && window.refreshDashboard) window.refreshDashboard();
    });
  } catch (e) { console.warn('[Dashboard] load failed', e); }
})();

// ---------- SRS : branchement sur boutons qualité ----------
(async () => {
  const srs = await import('./srs.js');
  window.SRS = srs;

  const box = document.getElementById('srsButtons');
  if (!box) return;

  box.addEventListener('click', e => {
    const btn = e.target.closest('[data-q]');
    if (!btn) return;
    const q = +btn.dataset.q;

    // Récupère l'état global exposé par le script inline de index.html
    if (!window.S || !window.S.ayahs || !window.S.ayahs[window.S.i]) return;
    const { S } = window;
    const ayah = S.ayahs[S.i];
    const key = `${S.n}:${ayah.num}`;

    // Charge / met à jour la carte
    const store = JSON.parse(localStorage.getItem('hifdh_v3') || '{}');
    store.m = store.m || {};
    const card = store.m[key]?.history
      ? store.m[key]
      : srs.newCard(S.n, ayah.num);
    store.m[key] = srs.review(card, q);
    localStorage.setItem('hifdh_v3', JSON.stringify(store));

    // Feedback visuel
    btn.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
      { duration: 300, easing: 'ease-out' }
    );

    // Rafraîchit dashboard
    if (window.refreshDashboard) window.refreshDashboard();

    // Feedback textuel
    const days = store.m[key].due - Math.floor(Date.now() / 864e5);
    const scoreEl = document.getElementById('score');
    if (scoreEl) {
      scoreEl.textContent = `✦ المراجعة القادمة بعد ${days} يوم`;
      setTimeout(() => { scoreEl.textContent = ''; }, 3000);
    }
  });
})();