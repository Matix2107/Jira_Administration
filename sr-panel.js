/*
 * ScriptRunner for Jira Cloud – Script Fragment (web panel) – wersja v4 (Approve/Reject + Adaptavist Bridge / Forge / Connect)
 * Cały widok (style + HTML) jest budowany przez ten skrypt,
 * więc działa nawet jeśli plik HTML/CSS się nie wczyta.
 */
(function () {
  'use strict';

  // ---------- KONFIGURACJA przycisków Approve / Reject ----------
  var CONFIG = {
    approveLabel: 'approved',
    rejectLabel: 'rejected',
    approveComment: '✅ Approved – zatwierdzone z panelu Script Fragment.',
    rejectComment: '❌ Rejected – odrzucone z panelu Script Fragment.',
    // Opcjonalnie: nazwa przejścia w workflow (np. 'Approve'). Puste = bez zmiany statusu.
    approveTransition: '',
    rejectTransition: ''
  };

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
    '@keyframes srs{to{transform:rotate(360deg)}}',
    '.sr-dec{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0 4px}',
    '.sr-ok,.sr-no{border:0;border-radius:6px;padding:9px;font-size:13px;font-weight:700;color:#fff;cursor:pointer}',
    '.sr-ok{background:#1f845a}.sr-ok:hover{background:#216e4e}',
    '.sr-no{background:#c9372c}.sr-no:hover{background:#ae2e24}',
    '.sr-ok[disabled],.sr-no[disabled]{opacity:.5;cursor:default}',
    '.sr-badge{margin:12px 0 4px;padding:9px;border-radius:6px;font-weight:700;text-align:center}',
    '.sr-badge.ok{background:#dcfff1;color:#216e4e}.sr-badge.no{background:#ffeceb;color:#ae2e24}',
    '.sr-undo{background:none;border:0;color:#0c66e4;cursor:pointer;font-size:12px;text-decoration:underline;margin-left:6px}',
    '.sr-msg{font-size:12px;margin-top:6px;color:#6b778c;text-align:center}'
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
  function log() { try { console.log.apply(console, ['[SR v4.1]'].concat([].slice.call(arguments))); } catch (e) {} }

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
    if (!live && lastInfo) h += '<div class="sr-err" style="margin-bottom:6px">' + esc(lastInfo) + '</div>';
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
    var labels = f.labels || [];
    var isOk = labels.indexOf(CONFIG.approveLabel) >= 0, isNo = labels.indexOf(CONFIG.rejectLabel) >= 0;
    if (isOk || isNo) {
      h += '<div class="sr-badge ' + (isOk ? 'ok' : 'no') + '">' + (isOk ? '✅ Zatwierdzone' : '❌ Odrzucone') +
        (live ? '<button class="sr-undo" id="sr-undo">cofnij</button>' : '') + '</div>';
    } else {
      h += '<div class="sr-dec"><button class="sr-ok" id="sr-ok">✓ Approve</button><button class="sr-no" id="sr-no">✕ Reject</button></div>';
    }
    h += '<div class="sr-msg" id="sr-msg"></div>';
    if (last.length) {
      h += '<div class="sr-muted" style="margin-top:8px">Ostatnie komentarze</div>';
      last.forEach(function (c) {
        var body = typeof c.body === 'string' ? c.body : '(treść w formacie ADF)';
        h += '<div class="sr-com"><b>' + esc(c.author ? c.author.displayName : '?') + '</b><p>' + esc(body) + '</p></div>';
      });
    }
    h += '<div class="sr-foot"><span class="sr-muted">' +
      (live ? 'Na żywo · ' + esc(lastInfo) : 'Tryb demo · ' + esc(lastInfo)) +
      '</span><button class="sr-btn" id="sr-r">↻ Odśwież</button></div>';
    h += '</div>';

    root().innerHTML = h;
    document.getElementById('sr-r').onclick = load;
    wireDecision(issue.key, live);
    var pb = document.getElementById('sr-pb');
    if (pb) setTimeout(function () { pb.style.width = pct + '%'; }, 50);
  }

  // ---------- 5. Pobieranie danych (Adaptavist Bridge / Forge / Connect AP) ----------
  var FIELDS = 'summary,status,priority,assignee,reporter,created,updated,duedate,labels,comment,subtasks';

  function parse(res) {
    if (res && typeof res.body === 'string') res = res.body;
    return typeof res === 'string' ? JSON.parse(res) : res;
  }

  function diag() {
    function keysOf(w) {
      try { return Object.keys(w).filter(function (k) { return /bridge|adaptavist|^AP$|forge|context|sr/i.test(k) && !/^on|^isSecureContext$/.test(k); }).join(',') || '-'; }
      catch (e) { return 'brak dostępu'; }
    }
    var inFrame = window.parent !== window;
    var parentInfo = inFrame ? keysOf(window.parent) : 'nie w iframe';
    var origin = ''; try { origin = location.origin + location.pathname.slice(0, 40); } catch (e) {}
    return 'origin=' + origin + ' | window: ' + keysOf(window) + ' | parent: ' + parentInfo;
  }

  // Wykrywa dostępny mechanizm; zwraca {name, getKey(): Promise<{key,location}>, get(url): Promise<obj>}
  function candidates() {
    var list = [window];
    try { if (window.parent && window.parent !== window && window.parent.document) list.push(window.parent); } catch (e) {}
    try { if (window.top && list.indexOf(window.top) < 0 && window.top.document) list.push(window.top); } catch (e) {}
    return list;
  }

  function detect() {
    var c = candidates();
    for (var i = 0; i < c.length; i++) {
      var api = detectIn(c[i]);
      if (api) { if (i > 0) api.name += ' (parent)'; return api; }
    }
    return null;
  }

  function detectIn(w) {
    if (w.AdaptavistBridge && w.AdaptavistBridgeContext && w.AdaptavistBridgeContext.context &&
        w.AdaptavistBridgeContext.context.issueKey) {
      return {
        name: 'AdaptavistBridge',
        getKey: function () {
          var c = w.AdaptavistBridgeContext.context;
          return Promise.resolve({ key: c.issueKey, location: c.location });
        },
        get: function (url) { return w.AdaptavistBridge.request({ url: url, type: 'GET' }).then(parse); },
        send: function (method, url, body) {
          return w.AdaptavistBridge.request({ url: url, type: method, data: JSON.stringify(body), contentType: 'application/json' });
        }
      };
    }
    if (w.__bridge && typeof w.__bridge.callBridge === 'function') {
      return {
        name: 'Forge bridge',
        getKey: function () {
          return w.__bridge.callBridge('getContext').then(function (ctx) {
            log('forge context:', ctx);
            var ext = (ctx && ctx.extension) || {};
            var key = (ext.issue && ext.issue.key) || (ext.issueKey) || null;
            return { key: key, location: ctx && ctx.moduleKey, raw: ctx };
          });
        },
        get: function (url) {
          return w.__bridge.callBridge('fetchProduct', {
            product: 'jira', restPath: url,
            fetchRequestInit: { method: 'GET', headers: { Accept: 'application/json' } }
          }).then(function (r) {
            log('forge fetch:', r);
            if (r && r.status && r.status >= 400) throw new Error('HTTP ' + r.status + ' ' + (r.statusText || ''));
            return parse(r);
          });
        },
        send: function (method, url, body) {
          return w.__bridge.callBridge('fetchProduct', {
            product: 'jira', restPath: url,
            fetchRequestInit: { method: method, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) }
          }).then(function (r) {
            log('forge send:', r);
            if (r && r.status && r.status >= 400) throw new Error('HTTP ' + r.status + ' ' + (r.body || r.statusText || ''));
            return r;
          });
        }
      };
    }
    if (w.AP && w.AP.context && w.AP.request) {
      return {
        name: 'Connect AP',
        getKey: function () {
          return new Promise(function (res) {
            w.AP.context.getContext(function (c) { res({ key: c && c.jira && c.jira.issue && c.jira.issue.key, location: 'connect' }); });
          });
        },
        get: function (url) {
          return new Promise(function (res, rej) {
            w.AP.request({ url: url, type: 'GET', success: function (t) { res(parse(t)); }, error: function (x) { rej(new Error('HTTP ' + (x && x.status))); } });
          });
        },
        send: function (method, url, body) {
          return new Promise(function (res, rej) {
            w.AP.request({ url: url, type: method, data: JSON.stringify(body), contentType: 'application/json',
              success: res, error: function (x) { rej(new Error('HTTP ' + (x && x.status))); } });
          });
        }
      };
    }
    return null;
  }

  function waitForApi(cb) {
    var t0 = Date.now();
    (function tick() {
      var api = detect();
      if (api) return cb(api);
      if (Date.now() - t0 > 8000) return cb(null);
      setTimeout(tick, 200);
    })();
  }

  var lastInfo = '';
  var currentApi = null;

  function setMsg(t) { var m = document.getElementById('sr-msg'); if (m) m.textContent = t; }

  function transitionByName(key, name) {
    if (!name) return Promise.resolve();
    var url = '/rest/api/2/issue/' + encodeURIComponent(key) + '/transitions';
    return currentApi.get(url).then(function (d) {
      var t = (d.transitions || []).filter(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })[0];
      if (!t) throw new Error('Brak przejścia „' + name + '” dla tego zgłoszenia');
      return currentApi.send('POST', url, { transition: { id: t.id } });
    });
  }

  function decide(key, approve) {
    var add = approve ? CONFIG.approveLabel : CONFIG.rejectLabel;
    var rem = approve ? CONFIG.rejectLabel : CONFIG.approveLabel;
    var base = '/rest/api/2/issue/' + encodeURIComponent(key);
    return currentApi.send('PUT', base, { update: { labels: [{ add: add }, { remove: rem }] } })
      .then(function () { return currentApi.send('POST', base + '/comment', { body: approve ? CONFIG.approveComment : CONFIG.rejectComment }); })
      .then(function () { return transitionByName(key, approve ? CONFIG.approveTransition : CONFIG.rejectTransition); });
  }

  function undo(key) {
    return currentApi.send('PUT', '/rest/api/2/issue/' + encodeURIComponent(key),
      { update: { labels: [{ remove: CONFIG.approveLabel }, { remove: CONFIG.rejectLabel }] } });
  }

  function wireDecision(key, live) {
    var ok = document.getElementById('sr-ok'), no = document.getElementById('sr-no'), un = document.getElementById('sr-undo');
    function run(p, label) {
      if (ok) ok.disabled = true; if (no) no.disabled = true;
      setMsg(label + '…');
      p.then(function () { setMsg('Gotowe ✓'); setTimeout(load, 700); })
       .catch(function (e) {
         log('decyzja błąd:', e);
         setMsg('Błąd: ' + (e && (e.message || JSON.stringify(e))));
         if (ok) ok.disabled = false; if (no) no.disabled = false;
       });
    }
    if (!live) {
      [ok, no].forEach(function (b) { if (b) b.onclick = function () { setMsg('Tryb demo – przyciski działają tylko w Jirze.'); }; });
      return;
    }
    if (ok) ok.onclick = function () { run(decide(key, true), 'Zatwierdzam'); };
    if (no) no.onclick = function () { run(decide(key, false), 'Odrzucam'); };
    if (un) un.onclick = function () { run(undo(key), 'Cofam'); };
  }

  function load() {
    showLoading('JS działa – szukam połączenia z Jirą…');
    waitForApi(function (api) {
      if (!api) {
        lastInfo = 'Nie znaleziono bridge. Globalne: ' + diag();
        log(lastInfo);
        render(MOCK, false);
        return;
      }
      log('używam:', api.name);
      currentApi = api;
      var finished = false;
      var timer = setTimeout(function () {
        if (!finished) showError('Brak odpowiedzi z Jiry po 10 s (' + api.name + ').');
      }, 10000);

      api.getKey().then(function (info) {
        if (!info || !info.key) throw new Error('Brak klucza zgłoszenia w kontekście (' + api.name + ')');
        showLoading('Pobieram ' + info.key + ' przez ' + api.name + '…');
        lastInfo = api.name + (info.location ? ' · ' + info.location : '');
        return api.get('/rest/api/2/issue/' + encodeURIComponent(info.key) + '?fields=' + FIELDS);
      }).then(function (issue) {
        finished = true; clearTimeout(timer);
        render(issue, true);
      }).catch(function (err) {
        finished = true; clearTimeout(timer);
        log('błąd:', err);
        showError('Błąd (' + api.name + '): ' + (err && (err.message || JSON.stringify(err))));
      });
    });
  }

  // ---------- 6. Start ----------
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
