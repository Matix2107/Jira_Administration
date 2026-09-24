/*
 * ScriptRunner for Jira Cloud – Script Fragment (web panel) – wersja v2
 * Cały widok (style + HTML) jest budowany przez ten skrypt,
 * więc działa nawet jeśli plik HTML/CSS się nie wczyta.
 */
(function () {
  'use strict';

  // ---------- 1. Style (wstrzykiwane z JS) ----------
  var CSS = [
    '#sr-app{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;color:#172b4d;margin:4px}',
    '#sr-app *{box-sizing:border-box}',
    '.sr-card{padding:16px;border-radius:10px;background:linear-gradient(160deg,#fff 0%,#f4f7ff 100%);border:1px solid #dfe1e6;box-shadow:0 2px 6px rgba(9,30,66,.08)}',
    '.sr-head{display:flex;align-items:center;gap:8px}',
    '.sr-key{font-weight:700;color:#0052cc;text-decoration:none}',
    '.sr-loz{margin-left:auto;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;text-transform:uppercase;background:#dfe1e6;color:#42526e}',
    '.sr-loz.indeterminate{background:#deebff;color:#0747a6}.sr-loz.done{background:#e3fcef;color:#006644}',
    '.sr-sum{margin:10px 0 14px;font-size:15px;font-weight:600;line-height:1.35}',
    '.sr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}',
    '.sr-stat{background:#fff;border:1px solid #ebecf0;border-radius:8px;padding:8px 4px;text-align:center}',
    '.sr-val{display:block;font-size:20px;font-weight:700;color:#0052cc}.sr-val.warn{color:#de350b}',
    '.sr-lbl{font-size:11px;color:#6b778c}',
    '.sr-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-top:1px solid #ebecf0}',
    '.sr-muted{color:#6b778c;font-size:12px}',
    '.sr-av{width:22px;height:22px;border-radius:50%;vertical-align:middle;margin-right:6px}',
    '.sr-bar{height:8px;background:#ebecf0;border-radius:4px;overflow:hidden;margin:4px 0 8px}',
    '.sr-bar>div{height:100%;width:0;background:linear-gradient(90deg,#36b37e,#00875a);transition:width .6s}',
    '.sr-com{padding:6px 0;border-top:1px solid #ebecf0;font-size:12px}',
    '.sr-com b{color:#172b4d}.sr-com p{margin:2px 0 0;color:#42526e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sr-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px}',
    '.sr-btn{border:0;border-radius:4px;padding:5px 10px;background:#0052cc;color:#fff;font-size:12px;cursor:pointer}',
    '.sr-err{color:#bf2600;background:#ffebe6;padding:10px;border-radius:6px;font-size:12px;white-space:pre-wrap}',
    '.sr-spin{display:inline-block;width:14px;height:14px;border:3px solid #deebff;border-top-color:#0052cc;border-radius:50%;animation:srs .8s linear infinite;vertical-align:middle;margin-right:8px}',
    '@keyframes srs{to{transform:rotate(360deg)}}'
  ].join('\n');

  var st = document.createElement('style');
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);

  // ---------- 2. Kontener (tworzony, jeśli HTML go nie ma) ----------
  function root() {
    var el = document.getElementById('sr-app');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sr-app';
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function days(a, b) { return Math.round((b - a) / 864e5); }
  function log() { try { console.log.apply(console, ['[SR v2]'].concat([].slice.call(arguments))); } catch (e) {} }

  function showLoading(msg) {
    root().innerHTML = '<div class="sr-card"><span class="sr-spin"></span>' + esc(msg) + '</div>';
  }
  function showError(msg) {
    root().innerHTML = '<div class="sr-card"><div class="sr-err">' + esc(msg) +
      '</div><div class="sr-foot"><span></span><button class="sr-btn" id="sr-r">↻ Spróbuj ponownie</button></div></div>';
    document.getElementById('sr-r').onclick = load;
  }

  // ---------- 3. Dane demo (poza Jirą) ----------
  var MOCK = {
    key: 'DEMO-123',
    fields: {
      summary: 'Przykładowe zgłoszenie – podgląd poza Jirą',
      status: { name: 'W toku', statusCategory: { key: 'indeterminate' } },
      priority: { name: 'High' },
      assignee: { displayName: 'Jan Kowalski' },
      reporter: { displayName: 'Anna Nowak' },
      created: new Date(Date.now() - 12 * 864e5).toISOString(),
      updated: new Date(Date.now() - 1 * 864e5).toISOString(),
      duedate: new Date(Date.now() + 2 * 864e5).toISOString().slice(0, 10),
      labels: ['demo', 'scriptrunner'],
      comment: {
        total: 2, comments: [
          { author: { displayName: 'Anna Nowak' }, body: 'Sprawdziłam na stagingu – działa.' },
          { author: { displayName: 'Jan Kowalski' }, body: 'Dzięki, wrzucam na produkcję w piątek.' }
        ]
      },
      subtasks: [
        { fields: { status: { statusCategory: { key: 'done' } } } },
        { fields: { status: { statusCategory: { key: 'done' } } } },
        { fields: { status: { statusCategory: { key: 'new' } } } }
      ]
    }
  };

  // ---------- 4. Render ----------
  function render(issue, live) {
    var f = issue.fields || {};
    var cat = f.status && f.status.statusCategory ? f.status.statusCategory.key : '';
    var age = f.created ? days(new Date(f.created), new Date()) : '–';
    var due = '—', dueWarn = false;
    if (f.duedate) {
      due = days(new Date(), new Date(f.duedate + 'T23:59:59'));
      dueWarn = due <= 2;
    }
    var subs = f.subtasks || [];
    var done = subs.filter(function (s) {
      return s.fields && s.fields.status && s.fields.status.statusCategory && s.fields.status.statusCategory.key === 'done';
    }).length;
    var pct = subs.length ? Math.round(done / subs.length * 100) : 0;

    var av = f.assignee && f.assignee.avatarUrls ? f.assignee.avatarUrls['24x24'] : '';
    var comments = (f.comment && f.comment.comments) || [];
    var last = comments.slice(-2).reverse();

    var h = '';
    h += '<div class="sr-card">';
    h += '<div class="sr-head"><a class="sr-key" target="_top" href="/browse/' + esc(issue.key) + '">' + esc(issue.key) + '</a>';
    h += '<span class="sr-loz ' + esc(cat) + '">' + esc(f.status ? f.status.name : '?') + '</span></div>';
    h += '<div class="sr-sum">' + esc(f.summary) + '</div>';

    h += '<div class="sr-stats">';
    h += '<div class="sr-stat"><span class="sr-val">' + esc(age) + '</span><span class="sr-lbl">dni otwarte</span></div>';
    h += '<div class="sr-stat"><span class="sr-val">' + esc(f.comment ? f.comment.total : 0) + '</span><span class="sr-lbl">komentarze</span></div>';
    h += '<div class="sr-stat"><span class="sr-val' + (dueWarn ? ' warn' : '') + '">' + esc(due) + '</span><span class="sr-lbl">dni do terminu</span></div>';
    h += '</div>';

    h += '<div class="sr-row"><span class="sr-muted">Przypisany</span><span>' +
      (av ? '<img class="sr-av" src="' + esc(av) + '">' : '') +
      esc(f.assignee ? f.assignee.displayName : 'Nieprzypisane') + '</span></div>';
    h += '<div class="sr-row"><span class="sr-muted">Zgłaszający</span><span>' + esc(f.reporter ? f.reporter.displayName : '—') + '</span></div>';
    h += '<div class="sr-row"><span class="sr-muted">Priorytet</span><span>' + esc(f.priority ? f.priority.name : '—') + '</span></div>';
    if (f.labels && f.labels.length) {
      h += '<div class="sr-row"><span class="sr-muted">Etykiety</span><span>' + esc(f.labels.join(', ')) + '</span></div>';
    }
    if (subs.length) {
      h += '<div class="sr-row"><span class="sr-muted">Podzadania</span><span>' + done + ' / ' + subs.length + '</span></div>';
      h += '<div class="sr-bar"><div id="sr-pb"></div></div>';
    }
    if (last.length) {
      h += '<div class="sr-muted" style="margin-top:8px">Ostatnie komentarze</div>';
      last.forEach(function (c) {
        var body = typeof c.body === 'string' ? c.body : '(treść w formacie ADF)';
        h += '<div class="sr-com"><b>' + esc(c.author ? c.author.displayName : '?') + '</b><p>' + esc(body) + '</p></div>';
      });
    }
    h += '<div class="sr-foot"><span class="sr-muted">' +
      (live ? 'Na żywo · ' + esc((window.AdaptavistBridgeContext.context || {}).location || '') : 'Tryb demo – brak AdaptavistBridge') +
      '</span><button class="sr-btn" id="sr-r">↻ Odśwież</button></div>';
    h += '</div>';

    root().innerHTML = h;
    document.getElementById('sr-r').onclick = load;
    var pb = document.getElementById('sr-pb');
    if (pb) setTimeout(function () { pb.style.width = pct + '%'; }, 50);
  }

  // ---------- 5. Pobieranie danych ----------
  function parse(res) {
    if (res && typeof res.body === 'string') res = res.body;
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  function bridgeReady() {
    return window.AdaptavistBridge && window.AdaptavistBridgeContext &&
      window.AdaptavistBridgeContext.context && window.AdaptavistBridgeContext.context.issueKey;
  }

  // Czekamy na bridge do 5 s (bywa wstrzykiwany z opóźnieniem)
  function waitForBridge(cb) {
    var t0 = Date.now();
    (function tick() {
      if (bridgeReady()) return cb(true);
      if (Date.now() - t0 > 5000) return cb(false);
      setTimeout(tick, 150);
    })();
  }

  function load() {
    showLoading('JS działa – czekam na AdaptavistBridge…');
    waitForBridge(function (ok) {
      log('bridge:', ok, window.AdaptavistBridgeContext);
      if (!ok) { render(MOCK, false); return; }

      var key = window.AdaptavistBridgeContext.context.issueKey;
      showLoading('Pobieram ' + key + '…');
      var finished = false;
      var timer = setTimeout(function () {
        if (!finished) showError('Brak odpowiedzi z Jiry po 10 s.\nissueKey: ' + key);
      }, 10000);

      window.AdaptavistBridge.request({
        url: '/rest/api/2/issue/' + encodeURIComponent(key) +
          '?fields=summary,status,priority,assignee,reporter,created,updated,duedate,labels,comment,subtasks',
        type: 'GET'
      }).then(function (res) {
        finished = true; clearTimeout(timer);
        log('odpowiedź:', res);
        try { render(parse(res), true); }
        catch (e) { showError('Nie udało się odczytać odpowiedzi: ' + e.message); }
      }, function (err) {
        finished = true; clearTimeout(timer);
        log('błąd:', err);
        showError('Błąd REST: ' + (err && (err.message || err.statusText || JSON.stringify(err))));
      });
    });
  }

  // ---------- 6. Start ----------
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();