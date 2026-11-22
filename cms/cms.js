/* =====================================================================
   CMS ADMIN — Coach Syaifudin Wahid
   Satu skrip untuk semua web (profil, PENJASKU, SuperNova).
   • Pengunjung: hanya membaca perubahan (ringan, tanpa SDK Firebase).
   • Admin (syaifudinwahid05@gmail.com): login Google → Mode Edit:
     edit teks langsung, ganti gambar, ubah tautan, sembunyikan,
     geser/atur urutan bagian (seret ⠿ atau ↑↓), dan Panel Data.
   Pemasangan (setelah file data, sebelum skrip tampilan):
   <script src="https://syaifudinwahid.vercel.app/cms/cms.js" data-site="nama" data-globals="DATA1,DATA2"></script>
   Skrip tampilan menunggu: (window.cmsReady||Promise.resolve()).then(render)
   ===================================================================== */
(function () {
  'use strict';
  const ME = document.currentScript || {};
  const DS = ME.dataset || {};
  const SITE = (DS.site || location.hostname).replace(/[^a-z0-9_-]/gi, '_');
  const GLOBALS = (DS.globals || '').split(',').map(s => s.trim()).filter(Boolean);
  const SHOW_LOGIN = DS.login === 'visible';
  const ADMIN = 'syaifudinwahid05@gmail.com';
  const CFG = { apiKey: 'AIzaSyCT1BcG3hehn6LhQeJ4RYQZA3TMcugfSsI', authDomain: 'victoria-swimming-club.firebaseapp.com', projectId: 'victoria-swimming-club', appId: '1:308202377929:web:9d1c59c3a9b2a2d20b7318' };
  const REST = 'https://firestore.googleapis.com/v1/projects/victoria-swimming-club/databases/(default)/documents/';
  const DOC_ID = 'site_' + SITE;
  const SITES = [
    { n: 'Web Profil (utama)', u: 'https://syaifudinwahid.vercel.app/' },
    { n: 'PENJASKU', u: 'https://pjokmaswahid.vercel.app/' },
    { n: 'SuperNova Atletik', u: 'https://supernova-atletik-tangerang.vercel.app/' }
  ];
  const qs = new URLSearchParams(location.search);
  const PAGE = (location.pathname.replace(/index\.html$/, '') || '/') + (() => { const p = new URLSearchParams(location.search); ['admin', 't', 'v', 'e', 'x', 'fbclid'].forEach(k => p.delete(k)); const s = p.toString(); return s ? '?' + s : ''; })();
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { } } };

  let DOC = { data: {}, pages: {} };
  const page = () => (DOC.pages[PAGE] ??= { t: {}, h: {}, i: {}, x: [], o: {} });

  /* ---------- baca data publik (REST, tanpa SDK) ---------- */
  const timeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
  async function readDoc() {
    const r = await fetch(REST + 'cms/' + DOC_ID + '?key=' + CFG.apiKey, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j.fields && j.fields.json ? JSON.parse(j.fields.json.stringValue) : null;
  }
  const assetCache = {};
  function asset(id) {
    return assetCache[id] ??= fetch(REST + 'cms_assets/' + id + '?key=' + CFG.apiKey).then(r => r.ok ? r.json() : null).then(j => j && j.fields && j.fields.data ? j.fields.data.stringValue : '').catch(() => '');
  }
  async function resolveAssets(v) {
    if (typeof v === 'string') return v.startsWith('cms:') ? (await asset(v.slice(4))) || v : v;
    if (Array.isArray(v)) return Promise.all(v.map(resolveAssets));
    if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = await resolveAssets(x); return o; }
    return v;
  }
  const RAW = {};   // data asli (dengan "cms:id") untuk Panel Data

  const style = document.createElement('style');
  style.textContent = 'html.cms-wait body{opacity:0}html body{transition:opacity .25s}';
  document.head.appendChild(style);
  document.documentElement.classList.add('cms-wait');
  const reveal = () => document.documentElement.classList.remove('cms-wait');
  setTimeout(reveal, 3000);

  window.cmsReady = (async () => {
    try {
      const d = await timeout(readDoc(), 2500);
      if (d) DOC = { data: d.data || {}, pages: d.pages || {} };
      for (const g of GLOBALS) {
        RAW[g] = JSON.parse(JSON.stringify(DOC.data[g] !== undefined ? DOC.data[g] : (window[g] ?? null)));
        if (DOC.data[g] !== undefined) window[g] = await timeout(resolveAssets(DOC.data[g]), 2500) || DOC.data[g];
      }
    } catch (e) { console.warn('CMS:', e); }
  })();
  window.cmsReady.then(() => setTimeout(() => { stampAll(); applyPage(); reveal(); watch(); boot(); }, 0));

  /* ---------- kunci elemen (jalur DOM awal) ---------- */
  const SKIP = el => el.closest && el.closest('.cms-ui');
  function pathOf(el) {
    const parts = [];
    while (el && el.nodeType === 1 && el !== document.body) {
      if (el.id && !/^cms/.test(el.id)) { parts.unshift('#' + el.id); break; }
      const p = el.parentElement; if (!p) break;
      const same = [...p.children].filter(c => c.tagName === el.tagName && !c.classList.contains('cms-ui'));
      parts.unshift(el.tagName.toLowerCase() + (same.length > 1 ? ':' + same.indexOf(el) : ''));
      el = p;
    }
    return parts.join('>');
  }
  function stampAll(root = document.body) {
    root.querySelectorAll('*').forEach(el => { if (!el.dataset.cmsK && !SKIP(el) && !/^(SCRIPT|STYLE|LINK|META|NOSCRIPT|BR)$/.test(el.tagName)) el.dataset.cmsK = pathOf(el); });
  }
  const byK = k => document.querySelector('[data-cms-k="' + CSS.escape(k) + '"]');

  /* ---------- terapkan perubahan halaman ---------- */
  let applying = false;
  async function applyPage() {
    const P = DOC.pages[PAGE]; if (!P) return;
    applying = true;
    for (const [k, order] of Object.entries(P.o || {})) { const box = byK(k); if (!box) continue; order.forEach(ck => { const c = [...box.children].find(x => x.dataset.cmsK === ck); if (c) box.appendChild(c); }); }
    for (const [k, html] of Object.entries(P.t || {})) { const el = byK(k); if (el && el.innerHTML !== html) el.innerHTML = clean(html); }
    for (const [k, href] of Object.entries(P.h || {})) { const el = byK(k); if (el) el.setAttribute('href', href); }
    for (const [k, src] of Object.entries(P.i || {})) { const el = byK(k); if (el) el.src = src.startsWith('cms:') ? (await asset(src.slice(4))) || el.src : src; }
    (P.x || []).forEach(k => { const el = byK(k); if (el) el.classList.add('cms-hide'); });
    applying = false;
  }
  const hideCss = document.createElement('style');
  hideCss.textContent = '.cms-hide{display:none!important}';
  document.head.appendChild(hideCss);
  // tampilan yang dibuat ulang oleh web (mis. pindah folder kelas) tetap mendapat perubahan
  let mt;
  function watch() {
    new MutationObserver(ms => {
      if (applying || editing) return;
      if (!ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && !SKIP(n)))) return;
      clearTimeout(mt); mt = setTimeout(() => { stampAll(); applyPage(); }, 60);
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- pembersih HTML (hanya format sebaris yang aman) ---------- */
  const OK = /^(B|STRONG|I|EM|U|S|MARK|SMALL|SUP|SUB|BR|A|SPAN)$/;
  function clean(html) {
    const d = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html').body.firstChild;
    (function walk(n) {
      [...n.childNodes].forEach(c => {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1 || !OK.test(c.tagName)) { if (c.nodeType === 1 && /^(DIV|P)$/.test(c.tagName)) { c.before(document.createElement('br')); } c.replaceWith(...(c.nodeType === 1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT)$/.test(c.tagName) ? c.childNodes : [])); return walk(n); }
        [...c.attributes].forEach(a => { if (!(c.tagName === 'A' && /^(href|target|rel)$/.test(a.name))) c.removeAttribute(a.name); });
        if (c.tagName === 'A' && /^\s*javascript:/i.test(c.getAttribute('href') || '')) c.removeAttribute('href');
        if (c.tagName === 'SPAN' && !c.attributes.length) { c.replaceWith(...c.childNodes); return walk(n); }
        walk(c);
      });
    })(d);
    return d.innerHTML.replace(/^(<br>)+/, '');
  }

  /* =====================================================================
     BAGIAN ADMIN (dimuat hanya bila diminta / pernah login)
     ===================================================================== */
  let F = null, user = null, editing = false, dirty = 0, sel = null;
  const isAdmin = () => user && user.email === ADMIN;

  function boot() {
    injectUiCss();
    const doors = [...document.querySelectorAll('[data-cms-login]')];
    doors.forEach(d => ['pointerenter', 'touchstart', 'focus'].forEach(ev => d.addEventListener(ev, () => initFirebase().catch(() => { }), { once: true, passive: true })));
    doors.forEach(d => d.addEventListener('click', e => { e.preventDefault(); if (editing) return; isAdmin() ? openMore() : (mountLauncher(), login()); }));
    if (SHOW_LOGIN || qs.has('admin') || store.get('cms_admin')) mountLauncher();
    if (doors.length && !qs.has('admin') && !store.get('cms_admin')) return;
    if (store.get('cms_admin')) initFirebase().then(() => { if (!isAdmin()) store.set('cms_admin', null); render(); });
    else if (!SHOW_LOGIN && !qs.has('admin')) mountSecretDoor();
  }
  function mountSecretDoor() { // pintu kecil di pojok untuk web selain web utama
    const b = el('button', 'cms-ui cms-door', '🔒'); b.title = 'Admin'; b.setAttribute('aria-label', 'Login admin');
    b.onclick = () => { b.remove(); mountLauncher(); }; document.body.appendChild(b);
  }
  let FP = null;
  function initFirebase() { return FP ??= initFb().catch(e => { FP = null; throw e; }); }
  async function initFb() {
    const G = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const [A, FA, FS] = await Promise.all([import(G + 'firebase-app.js'), import(G + 'firebase-auth.js'), import(G + 'firebase-firestore.js')]);
    const app = A.getApps().find(a => a.name === 'cms') || A.initializeApp(CFG, 'cms');
    F = { FA, FS, auth: FA.getAuth(app), db: FS.getFirestore(app) };
    try { await FA.getRedirectResult(F.auth); } catch (e) { console.warn('CMS redirect:', e.code); }
    await new Promise(res => { const un = FA.onAuthStateChanged(F.auth, u => { user = u; un(); res(); }); });
    FA.onAuthStateChanged(F.auth, u => { user = u; render(); });
    return F;
  }
  async function login() {
    try {
      await initFirebase();
      const prov = new F.FA.GoogleAuthProvider(); prov.setCustomParameters({ login_hint: ADMIN, prompt: 'select_account' });
      let r;
      try { r = await F.FA.signInWithPopup(F.auth, prov); }
      catch (e) { if (/popup-blocked|operation-not-supported|web-storage/.test(e.code || '')) { store.set('cms_admin', '1'); return F.FA.signInWithRedirect(F.auth, prov); } throw e; }
      if (r.user.email !== ADMIN) { await F.FA.signOut(F.auth); toast('Akun ' + r.user.email + ' bukan admin.', true); return; }
      store.set('cms_admin', '1'); toast('Masuk sebagai admin ✓'); render();
    } catch (e) { if (!/popup-closed|cancelled/.test(e.code || '')) toast(e.code === 'auth/unauthorized-domain' ? 'Domain ini belum diizinkan di Firebase.' : 'Gagal login: ' + (e.message || e), true); }
  }
  async function logout() {
    if (dirty && !confirm('Ada perubahan belum disimpan. Tetap keluar?')) return;
    store.set('cms_admin', null); if (F) await F.FA.signOut(F.auth); if (editing) setEdit(false); toast('Keluar dari admin'); render();
  }

  /* ---------- UI ---------- */
  let bar = null;
  function mountLauncher() { if (!bar) { bar = el('div', 'cms-ui cms-bar'); document.body.appendChild(bar); } render(); }
  function render() {
    document.querySelectorAll('[data-cms-login]').forEach(d => { d.textContent = isAdmin() ? '✓ Admin' : 'Login'; d.classList.toggle('is-admin', !!isAdmin()); });
    if (!bar) { if (isAdmin()) mountLauncher(); return; }
    if (!isAdmin()) { bar.innerHTML = ''; const b = el('button', 'cms-btn pri', '🔐 Login Admin'); b.onclick = login; bar.appendChild(b); return; }
    bar.innerHTML = `<span class="cms-who" title="${ADMIN}">👤 Admin</span>
      <button class="cms-btn ${editing ? 'on' : ''}" data-a="edit">${editing ? '✏️ Mode Edit: ON' : '✏️ Mode Edit'}</button>
      ${GLOBALS.length ? '<button class="cms-btn" data-a="data">🗂 Panel Data</button>' : ''}
      <button class="cms-btn pri" data-a="save" ${dirty ? '' : 'disabled'}>💾 Simpan${dirty ? ' (' + dirty + ')' : ''}</button>
      <button class="cms-btn" data-a="more" aria-label="Menu lain">⋯</button>`;
    bar.onclick = e => { const a = e.target.closest('[data-a]'); if (!a) return; ({ edit: () => setEdit(!editing), data: openData, save: saveAll, more: openMore })[a.dataset.a](); };
  }
  function openMore() {
    const m = modal('Menu admin', `<p class="cms-mut">Masuk: <b>${user.email}</b></p>
      <h4>Edit web lain</h4><div class="cms-list">${SITES.map(s => `<a class="cms-item" href="${s.u}?admin=1" target="_blank" rel="noopener">${s.n}<span>↗</span></a>`).join('')}</div>
      <p class="cms-mut small">Di web lain tekan <b>🔐 Login Admin</b> sekali (akun Google yang sama).</p>
      <h4>Halaman ini</h4>
      <button class="cms-btn" data-m="undo">↩️ Batalkan perubahan yang belum disimpan</button>
      <button class="cms-btn" data-m="reset">🧹 Kembalikan halaman ini ke aslinya</button>
      <button class="cms-btn" data-m="help">❓ Cara pakai</button>
      <button class="cms-btn danger" data-m="out">🚪 Keluar</button>`);
    m.onclick = async e => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'undo') { if (!dirty || confirm('Buang semua perubahan yang belum disimpan?')) { store.set('cms_resume', editing ? '1' : null); location.reload(); } }
      if (b.dataset.m === 'reset') { if (confirm('Hapus SEMUA editan pada halaman ini dan kembali ke tampilan asli?')) { delete DOC.pages[PAGE]; await write(); location.reload(); } }
      if (b.dataset.m === 'help') { closeModal(); help(); }
      if (b.dataset.m === 'out') { closeModal(); logout(); }
    };
  }
  function help() {
    modal('Cara pakai Mode Edit', `<ol class="cms-help">
      <li><b>Klik tulisan</b> mana saja lalu ketik langsung. Pilih teks lalu tekan <b>B</b>/<b>I</b> untuk tebal/miring.</li>
      <li><b>Klik bagian</b> (kartu, tombol, seksi) untuk memilihnya. Tekan <b>⬆ Induk</b> untuk memilih wadah yang lebih besar.</li>
      <li><b>Geser</b>: tahan <b>⠿</b> lalu seret ke posisi baru, atau tekan <b>↑ ↓</b>.</li>
      <li><b>🖼 Ganti gambar</b> pada gambar yang dipilih, <b>🔗 Tautan</b> untuk mengubah alamat tombol/link.</li>
      <li><b>🙈 Sembunyikan</b> bagian yang tidak dipakai (bisa dimunculkan lagi di Mode Edit).</li>
      <li><b>🗂 Panel Data</b>: tambah/ubah/hapus isi daftar (materi, atlet, profil) lewat formulir.</li>
      <li>Tekan <b>💾 Simpan</b> — perubahan langsung tampil untuk semua pengunjung.</li></ol>`);
  }

  /* ---------- MODE EDIT ---------- */
  const BLOCKY = /^(DIV|SECTION|ARTICLE|HEADER|FOOTER|MAIN|NAV|ASIDE|UL|OL|LI|P|H1|H2|H3|H4|H5|H6|FIGURE|TABLE|TR|TD|BLOCKQUOTE|FORM|DETAILS|SUMMARY|DL|DT|DD|LABEL|BUTTON|A|IMG|SVG|PICTURE|VIDEO|CANVAS|IFRAME)$/;
  const textUnit = el => { // elemen teks terkecil yang aman diedit
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (SKIP(e)) return null;
      if (/^(IMG|SVG|CANVAS|VIDEO|IFRAME|INPUT|TEXTAREA|SELECT)$/.test(e.tagName)) return null;
      const blockKids = [...e.children].some(c => BLOCKY.test(c.tagName) && !/^(A|BUTTON)$/.test(c.tagName) || /^(IMG|SVG)$/.test(c.tagName));
      if (!blockKids && e.textContent.trim()) return e;
      if (blockKids) return null;
    }
    return null;
  };
  let tools = null, hoverEl = null, orig = new Map();
  function setEdit(on) {
    editing = on; document.documentElement.classList.toggle('cms-editing', on);
    store.set('cms_resume', null);
    if (on) { document.querySelectorAll('.cms-hide').forEach(e => { e.classList.remove('cms-hide'); e.classList.add('cms-ghost'); }); document.addEventListener('click', onClick, true); document.addEventListener('mouseover', onHover, true); toast('Mode Edit aktif — klik apa saja untuk mengubah'); }
    else { select(null); document.removeEventListener('click', onClick, true); document.removeEventListener('mouseover', onHover, true); document.querySelectorAll('.cms-ghost').forEach(e => { e.classList.remove('cms-ghost'); e.classList.add('cms-hide'); }); if (hoverEl) hoverEl.classList.remove('cms-hov'); }
    render();
  }
  function onHover(e) { if (SKIP(e.target)) return; if (hoverEl) hoverEl.classList.remove('cms-hov'); hoverEl = e.target.closest('[data-cms-k]'); if (hoverEl && hoverEl !== sel) hoverEl.classList.add('cms-hov'); }
  function onClick(e) {
    if (SKIP(e.target)) return;
    const t = e.target.closest('[data-cms-k]'); if (!t) return;
    if (t.isContentEditable) return;            // sedang mengetik di dalamnya
    e.preventDefault(); e.stopPropagation();     // tautan/tombol tidak berjalan saat mengedit
    select(t);
    const u = textUnit(e.target);
    if (u) startText(u);
  }
  function select(t) {
    if (sel) sel.classList.remove('cms-sel');
    sel = t; if (tools) { tools.remove(); tools = null; }
    if (!t) return;
    t.classList.add('cms-sel'); t.classList.remove('cms-hov');
    const isImg = t.tagName === 'IMG' || t.querySelector(':scope > img');
    const link = t.closest('a[href]');
    tools = el('div', 'cms-ui cms-tools');
    tools.innerHTML = `<span class="cms-tag">${t.tagName.toLowerCase()}</span>
      <button data-t="drag" class="cms-drag" title="Tahan & seret untuk menggeser">⠿</button>
      <button data-t="up" title="Naik">↑</button><button data-t="down" title="Turun">↓</button>
      <button data-t="parent" title="Pilih wadah yang lebih besar">⬆ Induk</button>
      ${isImg ? '<button data-t="img">🖼 Ganti gambar</button>' : ''}
      ${link ? '<button data-t="link">🔗 Tautan</button>' : ''}
      <button data-t="b" title="Tebal"><b>B</b></button><button data-t="i" title="Miring"><i>I</i></button>
      <button data-t="hide">${t.classList.contains('cms-ghost') ? '👁 Tampilkan' : '🙈 Sembunyikan'}</button>
      <button data-t="x" title="Tutup">✕</button>`;
    document.body.appendChild(tools); place();
    tools.onpointerdown = e => { if (e.target.closest('[data-t="drag"]')) startDrag(e); };
    tools.onmousedown = e => { if (e.target.closest('[data-t="b"],[data-t="i"]')) e.preventDefault(); };
    tools.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; ({ up: () => move(-1), down: () => move(1), parent: () => { const p = sel.parentElement.closest('[data-cms-k]'); if (p) select(p); }, img: pickImage, link: editLink, hide: toggleHide, b: () => document.execCommand('bold'), i: () => document.execCommand('italic'), x: () => select(null), drag: () => { } })[b.dataset.t](); };
  }
  function place() { if (!tools || !sel) return; const r = sel.getBoundingClientRect(); const top = Math.max(8, r.top - tools.offsetHeight - 8); tools.style.top = (top + scrollY) + 'px'; tools.style.left = Math.min(Math.max(8, r.left + scrollX), scrollX + innerWidth - tools.offsetWidth - 8) + 'px'; }
  addEventListener('scroll', () => editing && place(), { passive: true }); addEventListener('resize', () => editing && place());

  function startText(u) {
    if (!orig.has(u)) orig.set(u, u.innerHTML);
    u.querySelectorAll('.ch').forEach(s => s.replaceWith(document.createTextNode(s.textContent.replace(/ /g, ' '))));   // animasi huruf → teks biasa
    u.contentEditable = 'true'; u.focus();
    const end = () => {
      u.removeEventListener('blur', end); u.removeEventListener('keydown', key); u.contentEditable = 'false';
      const html = clean(u.innerHTML);
      if (html !== clean(orig.get(u) || '')) { page().t[u.dataset.cmsK] = html; mark(); }
    };
    const key = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.execCommand('insertLineBreak'); } if (e.key === 'Escape') u.blur(); };
    u.addEventListener('blur', end); u.addEventListener('keydown', key);
  }
  function siblingsOf(t) { return [...t.parentElement.children].filter(c => c.dataset.cmsK && !SKIP(c)); }
  function recordOrder(parent) { page().o[parent.dataset.cmsK] = [...parent.children].map(c => c.dataset.cmsK).filter(Boolean); mark(); }
  function move(d) {
    const sib = siblingsOf(sel), i = sib.indexOf(sel), j = i + d;
    if (j < 0 || j >= sib.length) return toast('Sudah paling ' + (d < 0 ? 'atas' : 'bawah'));
    d < 0 ? sib[j].before(sel) : sib[j].after(sel);
    recordOrder(sel.parentElement); sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); setTimeout(place, 250);
  }
  function startDrag(e) {
    e.preventDefault();
    const parent = sel.parentElement, ghost = sel.cloneNode(true);
    const r = sel.getBoundingClientRect();
    ghost.className += ' cms-ui cms-dragghost'; ghost.style.width = r.width + 'px'; document.body.appendChild(ghost);
    sel.classList.add('cms-dragging');
    const mv = ev => {
      ghost.style.left = ev.clientX - r.width / 2 + 'px'; ghost.style.top = ev.clientY - 20 + 'px';
      ghost.style.display = 'none'; const under = document.elementFromPoint(ev.clientX, ev.clientY); ghost.style.display = '';
      const target = under && [...parent.children].find(c => c !== sel && c.contains(under) && c.dataset.cmsK);
      if (target) { const tr = target.getBoundingClientRect(); const after = (ev.clientY - tr.top) > tr.height / 2 || ((ev.clientX - tr.left) > tr.width / 2 && tr.height < 120); after ? target.after(sel) : target.before(sel); }
      if (ev.clientY < 60) scrollBy(0, -12); if (ev.clientY > innerHeight - 60) scrollBy(0, 12);
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); ghost.remove(); sel.classList.remove('cms-dragging'); recordOrder(parent); place(); toast('Posisi diubah'); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); mv(e);
  }
  function toggleHide() {
    const k = sel.dataset.cmsK, x = page().x;
    if (sel.classList.toggle('cms-ghost')) { if (!x.includes(k)) x.push(k); toast('Disembunyikan (masih terlihat samar di Mode Edit)'); }
    else { page().x = x.filter(y => y !== k); toast('Ditampilkan lagi'); }
    mark(); select(sel);
  }
  function editLink() {
    const a = sel.closest('a[href]'); const v = prompt('Alamat tautan (https://… atau #bagian):', a.getAttribute('href'));
    if (v == null) return; if (/^\s*javascript:/i.test(v)) return toast('Alamat tidak diizinkan', true);
    a.setAttribute('href', v.trim()); a.dataset.cmsK || (a.dataset.cmsK = pathOf(a)); page().h[a.dataset.cmsK] = v.trim(); mark(); toast('Tautan diubah');
  }
  function pickImage() {
    const img = sel.tagName === 'IMG' ? sel : sel.querySelector(':scope > img');
    const inp = el('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; toast('Mengunggah gambar…');
      try { const id = await uploadImage(f, img.naturalWidth > 900 ? 1400 : 900); img.src = await asset(id); page().i[img.dataset.cmsK] = 'cms:' + id; mark(); toast('Gambar diganti ✓'); }
      catch (e) { toast('Gagal mengunggah: ' + (e.message || e), true); }
    };
    inp.click();
  }
  async function uploadImage(file, max = 1200) {
    await initFirebase();
    let data = await compress(file, max, 0.82);
    if (data.length > 900000) data = await compress(file, Math.round(max * 0.7), 0.7);
    if (data.length > 900000) throw new Error('gambar terlalu besar');
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    await F.FS.setDoc(F.FS.doc(F.db, 'cms_assets', id), { data, site: SITE, at: new Date().toISOString() });
    assetCache[id] = Promise.resolve(data);
    return id;
  }
  function compress(file, max, q) {
    return new Promise((res, rej) => { const i = new Image(), u = URL.createObjectURL(file); i.onload = () => { const s = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * s); c.height = Math.round(i.height * s); const g = c.getContext('2d'); g.drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(u); const png = file.type === 'image/png'; res(c.toDataURL(png ? 'image/png' : 'image/jpeg', q)); }; i.onerror = () => rej(new Error('gambar tidak terbaca')); i.src = u; });
  }
  function mark() { dirty++; render(); }
  async function write() {
    await initFirebase();
    for (const k of Object.keys(DOC.pages)) { const p = DOC.pages[k]; if (!Object.keys(p.t || {}).length && !Object.keys(p.h || {}).length && !Object.keys(p.i || {}).length && !(p.x || []).length && !Object.keys(p.o || {}).length) delete DOC.pages[k]; }
    const json = JSON.stringify(DOC);
    if (json.length > 950000) throw new Error('Data terlalu besar');
    await F.FS.setDoc(F.FS.doc(F.db, 'cms', DOC_ID), { json, site: SITE, updatedAt: new Date().toISOString(), by: user.email });
  }
  async function saveAll() {
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    try { await write(); dirty = 0; orig = new Map(); render(); toast('Tersimpan ✓ — langsung tampil untuk semua pengunjung'); }
    catch (e) { toast('Gagal menyimpan: ' + (e.code === 'permission-denied' ? 'akses ditolak (bukan akun admin)' : e.message || e), true); }
  }
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- PANEL DATA (formulir untuk isi berbasis data) ---------- */
  const LABEL = { nama: 'Nama', judul: 'Judul', sub: 'Subjudul', ringkas: 'Ringkasan', link: 'Tautan', foto: 'Foto', kelas: 'Kelas', semester: 'Semester', jenjang: 'Jenjang', topik: 'Topik', motto: 'Motto', tentang: 'Tentang', sekolah: 'Sekolah', kota: 'Kota', klub: 'Klub', prestasi: 'Prestasi', pb: 'Catatan terbaik (PB)', target: 'Target', nomor: 'Nomor', detik: 'Waktu (detik)', tampil: 'Waktu tampil', event: 'Event', tempat: 'Tempat', tahun: 'Tahun', hasil: 'Hasil', medali: 'Medali (gold/silver/bronze)', instagram: 'Instagram', tiktok: 'TikTok', idola: 'Idola', kategori: 'Kategori', gender: 'Jenis kelamin', lahir: 'Tahun lahir', bulanLahir: 'Bulan lahir', sejak: 'Mulai latihan', panggilan: 'Panggilan', waktu: 'Waktu target', dari: 'Dari (detik)', ke: 'Ke (detik)', peran: 'Peran', gelar: 'Gelar', sapaan: 'Sapaan', tautan: 'Tautan tambahan', label: 'Label' };
  const isImgKey = k => /^(foto|img|image|gambar|logo|thumb|cover|poster)$/i.test(k);
  function openData() {
    const work = {}; GLOBALS.forEach(g => work[g] = JSON.parse(JSON.stringify(RAW[g] ?? window[g] ?? null)));
    const m = modal('🗂 Panel Data', `<p class="cms-mut">Ubah isi daftar di web ini. Tekan <b>Simpan data</b> lalu halaman dimuat ulang.</p><div class="cms-tabs">${GLOBALS.map((g, i) => `<button data-g="${g}" class="${i ? '' : 'on'}">${g}</button>`).join('')}</div><div id="cms-form"></div>
      <div class="cms-foot"><button class="cms-btn" data-x>Batal</button><button class="cms-btn pri" id="cms-dsave">💾 Simpan data</button></div>`, true);
    let cur = GLOBALS[0];
    const draw = () => { const box = m.querySelector('#cms-form'); box.innerHTML = ''; box.appendChild(field(work, cur, cur, 0)); };
    m.querySelector('.cms-tabs').onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; cur = b.dataset.g; m.querySelectorAll('.cms-tabs button').forEach(x => x.classList.toggle('on', x === b)); draw(); };
    m.querySelector('#cms-dsave').onclick = async e => {
      e.target.disabled = true; e.target.textContent = 'Menyimpan…';
      try { GLOBALS.forEach(g => DOC.data[g] = work[g]); await write(); toast('Data tersimpan ✓'); store.set('cms_resume', editing ? '1' : null); setTimeout(() => location.reload(), 600); }
      catch (er) { toast('Gagal: ' + (er.message || er), true); e.target.disabled = false; e.target.textContent = '💾 Simpan data'; }
    };
    draw();
  }
  function field(obj, key, label, depth) {
    const v = obj[key];
    const wrap = el('div', 'cms-f');
    const name = LABEL[key] || (typeof key === 'number' ? '' : key);
    if (Array.isArray(v)) {
      const det = el('details', 'cms-arr'); det.open = depth < 1;
      det.innerHTML = `<summary>${esc(name || label)} <span class="cms-mut">(${v.length})</span></summary>`;
      const list = el('div', 'cms-items');
      v.forEach((it, i) => {
        const row = el('div', 'cms-row');
        const head = el('div', 'cms-rowh');
        const title = it && typeof it === 'object' ? (it.judul || it.nama || it.label || it.event || it.nomor || Object.values(it).find(x => typeof x === 'string') || 'Item') : '';
        head.innerHTML = `<b>${i + 1}. ${esc(String(title).slice(0, 60))}</b><span><button data-r="up" title="Naik">↑</button><button data-r="down" title="Turun">↓</button><button data-r="dup" title="Gandakan">⧉</button><button data-r="del" title="Hapus">🗑</button></span>`;
        head.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; e.preventDefault();
          if (b.dataset.r === 'up' && i > 0) [v[i - 1], v[i]] = [v[i], v[i - 1]];
          if (b.dataset.r === 'down' && i < v.length - 1) [v[i + 1], v[i]] = [v[i], v[i + 1]];
          if (b.dataset.r === 'dup') v.splice(i + 1, 0, JSON.parse(JSON.stringify(it)));
          if (b.dataset.r === 'del' && confirm('Hapus item ini?')) v.splice(i, 1);
          wrap.replaceWith(field(obj, key, label, depth)); };
        row.appendChild(head);
        if (it && typeof it === 'object') { const d = el('details'); d.innerHTML = '<summary class="cms-mut">Ubah isi</summary>'; d.appendChild(field(v, i, '', depth + 1)); row.appendChild(d); }
        else row.appendChild(field(v, i, '', depth + 1));
        list.appendChild(row);
      });
      const add = el('button', 'cms-btn small', '+ Tambah'); add.type = 'button';
      add.onclick = () => { const tpl = v.length ? blank(JSON.parse(JSON.stringify(v[v.length - 1]))) : ''; v.push(tpl); wrap.replaceWith(field(obj, key, label, depth)); };
      det.append(list, add); wrap.appendChild(det); return wrap;
    }
    if (v && typeof v === 'object') {
      const box = el('div', depth ? 'cms-obj' : ''); if (name && depth) box.innerHTML = `<div class="cms-lab">${esc(name)}</div>`;
      Object.keys(v).forEach(k => box.appendChild(field(v, k, k, depth + 1)));
      wrap.appendChild(box); return wrap;
    }
    const lab = el('label', 'cms-lab2'); lab.innerHTML = name ? `<span>${esc(name)}</span>` : '';
    let inp;
    if (typeof v === 'boolean') { inp = el('input'); inp.type = 'checkbox'; inp.checked = v; inp.onchange = () => obj[key] = inp.checked; }
    else if (typeof v === 'number') { inp = el('input'); inp.type = 'number'; inp.step = 'any'; inp.value = v; inp.oninput = () => obj[key] = inp.value === '' ? 0 : +inp.value; }
    else { const s = v == null ? '' : String(v); inp = s.length > 70 || s.includes('\n') ? el('textarea') : el('input'); inp.value = s; inp.oninput = () => obj[key] = inp.value; }
    lab.appendChild(inp);
    if (isImgKey(String(key))) {
      const up = el('button', 'cms-btn small', '🖼 Unggah'); up.type = 'button';
      up.onclick = () => { const f = el('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = async () => { if (!f.files[0]) return; up.textContent = 'Mengunggah…'; try { const id = await uploadImage(f.files[0], 1000); obj[key] = 'cms:' + id; inp.value = 'cms:' + id; up.textContent = '✓ Terunggah'; } catch (e) { up.textContent = '🖼 Unggah'; toast('Gagal: ' + e.message, true); } }; f.click(); };
      lab.appendChild(up);
    }
    wrap.appendChild(lab); return wrap;
  }
  function blank(o) { if (Array.isArray(o)) return []; if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = typeof o[k] === 'number' ? 0 : typeof o[k] === 'boolean' ? false : Array.isArray(o[k]) ? [] : (o[k] && typeof o[k] === 'object') ? blank(o[k]) : ''; return o; } return ''; }

  /* ---------- utilitas UI ---------- */
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  let modalEl = null;
  function modal(title, html, wide) {
    closeModal();
    modalEl = el('div', 'cms-ui cms-modal'); modalEl.innerHTML = `<div class="cms-box ${wide ? 'wide' : ''}"><div class="cms-mh"><b>${title}</b><button data-x aria-label="Tutup">✕</button></div><div class="cms-mb">${html}</div></div>`;
    modalEl.addEventListener('click', e => { if (e.target === modalEl || e.target.closest('[data-x]')) closeModal(); });
    document.body.appendChild(modalEl); return modalEl.querySelector('.cms-mb');
  }
  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }
  function toast(msg, bad) { const t = el('div', 'cms-ui cms-toast' + (bad ? ' bad' : ''), esc(msg)); document.body.appendChild(t); setTimeout(() => t.classList.add('out'), bad ? 4500 : 2400); setTimeout(() => t.remove(), bad ? 5000 : 2900); }
  function injectUiCss() {
    if (document.getElementById('cms-css')) return;
    const s = el('style'); s.id = 'cms-css';
    s.textContent = `.cms-ui,.cms-ui *{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:0;text-transform:none}
.cms-bar{position:fixed;z-index:2147483000;left:50%;bottom:14px;transform:translateX(-50%);display:flex;gap:6px;align-items:center;padding:6px;border-radius:16px;background:#111827;box-shadow:0 18px 40px -12px rgba(0,0,0,.6);max-width:calc(100vw - 16px);overflow-x:auto}
.cms-bar:empty{display:none}
.cms-who{color:#9ca3af;font-size:12px;font-weight:700;padding:0 6px;white-space:nowrap}
.cms-btn{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 12px;border-radius:11px;border:1px solid #374151;background:#1f2937;color:#f9fafb;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;text-decoration:none}
.cms-btn:hover{background:#374151}.cms-btn:disabled{opacity:.45;cursor:default}
.cms-btn.pri{background:#2563eb;border-color:#2563eb}.cms-btn.on{background:#16a34a;border-color:#16a34a}.cms-btn.danger{background:#b91c1c;border-color:#b91c1c}
.cms-btn.small{min-height:32px;font-size:12px;padding:0 10px}
.cms-door{position:fixed;z-index:2147483000;left:10px;bottom:10px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(0,0,0,.1);background:rgba(255,255,255,.7);opacity:.35;cursor:pointer;font-size:14px}
.cms-door:hover{opacity:1}
html.cms-editing [data-cms-k].cms-hov{outline:2px dashed rgba(37,99,235,.55);outline-offset:2px;cursor:pointer}
html.cms-editing [data-cms-k].cms-sel{outline:2px solid #2563eb!important;outline-offset:3px}
html.cms-editing [contenteditable=true]{outline:2px solid #16a34a!important;background:rgba(22,163,74,.06);cursor:text}
html.cms-editing .cms-ghost{opacity:.35;outline:2px dotted #b91c1c}
html.cms-editing .rv{opacity:1!important;transform:none!important;filter:none!important}
.cms-dragging{opacity:.25}
.cms-dragghost{position:fixed!important;z-index:2147483001;pointer-events:none;opacity:.85;transform:rotate(1.5deg);box-shadow:0 20px 40px rgba(0,0,0,.35)}
.cms-tools{position:absolute;z-index:2147483000;display:flex;flex-wrap:wrap;gap:4px;padding:5px;border-radius:12px;background:#111827;box-shadow:0 12px 30px -8px rgba(0,0,0,.6);max-width:calc(100vw - 16px)}
.cms-tools button{min-height:32px;min-width:32px;padding:0 8px;border:0;border-radius:8px;background:#1f2937;color:#fff;font-size:12px;font-weight:700;cursor:pointer}
.cms-tools button:hover{background:#374151}.cms-tools .cms-drag{cursor:grab;touch-action:none;background:#2563eb}
.cms-tag{color:#9ca3af;font:700 11px ui-monospace,monospace;align-self:center;padding:0 4px}
.cms-modal{position:fixed;inset:0;z-index:2147483002;background:rgba(17,24,39,.55);display:flex;align-items:flex-end;justify-content:center}
@media(min-width:700px){.cms-modal{align-items:center;padding:20px}}
.cms-box{width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;background:#fff;color:#111827;border-radius:18px 18px 0 0;overflow:hidden}
@media(min-width:700px){.cms-box{border-radius:18px}}.cms-box.wide{max-width:760px}
.cms-mh{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb}
.cms-mh button{border:0;background:none;font-size:18px;cursor:pointer}
.cms-mb{padding:14px 16px;overflow:auto;display:grid;gap:10px}
.cms-mb h4{margin:6px 0 0;font-size:13px;color:#374151}.cms-mut{color:#6b7280;font-size:13px;margin:0}.small{font-size:12px}
.cms-mb .cms-btn{background:#f3f4f6;color:#111827;border-color:#e5e7eb;justify-content:flex-start}.cms-mb .cms-btn.pri{background:#2563eb;color:#fff}.cms-mb .cms-btn.danger{background:#fee2e2;color:#b91c1c;border-color:#fecaca}
.cms-list{display:grid;gap:6px}.cms-item{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:10px;color:#111827;text-decoration:none;font-weight:700;font-size:14px}
.cms-help{margin:0;padding-left:18px;display:grid;gap:8px;font-size:14px;line-height:1.45}
.cms-tabs{display:flex;gap:6px;flex-wrap:wrap}.cms-tabs button{padding:6px 12px;border-radius:99px;border:1px solid #e5e7eb;background:#fff;font-weight:700;cursor:pointer}.cms-tabs button.on{background:#111827;color:#fff}
.cms-f{display:grid;gap:6px}.cms-obj{display:grid;gap:8px;padding:10px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa}
.cms-lab{font-size:12px;font-weight:800;color:#374151;text-transform:uppercase}
.cms-lab2{display:grid;gap:4px;font-size:12px;font-weight:700;color:#374151}
.cms-lab2 input,.cms-lab2 textarea{width:100%;min-height:38px;padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;font:500 15px system-ui,sans-serif;color:#111827;background:#fff}
.cms-lab2 textarea{min-height:80px;resize:vertical}.cms-lab2 input[type=checkbox]{width:20px;min-height:20px}
.cms-arr>summary{cursor:pointer;font-weight:800;font-size:14px;padding:6px 0}
.cms-items{display:grid;gap:8px;margin:6px 0}
.cms-row{border:1px solid #e5e7eb;border-radius:10px;padding:8px;display:grid;gap:6px;background:#fff}
.cms-rowh{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:13px}
.cms-rowh button{border:1px solid #e5e7eb;background:#f9fafb;border-radius:6px;min-width:30px;min-height:28px;cursor:pointer;margin-left:2px}
.cms-foot{position:sticky;bottom:-14px;display:flex;justify-content:flex-end;gap:8px;padding:10px 0;background:#fff;border-top:1px solid #e5e7eb}
.cms-foot .cms-btn{justify-content:center}
.cms-toast{position:fixed;z-index:2147483003;left:50%;top:16px;transform:translateX(-50%);padding:10px 16px;border-radius:12px;background:#111827;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.3);transition:opacity .4s;max-width:92vw}
.cms-toast.bad{background:#b91c1c}.cms-toast.out{opacity:0}`;
    document.head.appendChild(s);
  }
  // lanjutkan Mode Edit setelah muat ulang (mis. setelah menyimpan data)
  const resumeIv = setInterval(() => { if (isAdmin()) { clearInterval(resumeIv); if (store.get('cms_resume')) setEdit(true); } }, 500);
  setTimeout(() => clearInterval(resumeIv), 15000);
  window.CMS = { login, logout, site: SITE, page: PAGE };
})();
