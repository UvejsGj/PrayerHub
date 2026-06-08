/* ============================================================
   PrayerHub — cloud sync (Supabase)
   Adds optional accounts + cross-device sync ON TOP of the local
   storage the app already uses. Signed out, everything still works
   locally; signed in, all `prayerhub.*` data syncs to one row in the
   `user_state` table (protected by row-level security).
   ============================================================ */
PH.cloud = (function () {
  const $ = id => document.getElementById(id);

  // Public, RLS-protected values — safe to ship in client code.
  const SUPABASE_URL = 'https://kspfioftqyilgfuvzsbw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcGZpb2Z0cXlpbGdmdXZ6c2J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDg4OTgsImV4cCI6MjA5NjQ4NDg5OH0.mtY9kS1AaXzeKPcMNIUXHjseksTiOu0ak-TKIx7F1NI';

  let client = null, session = null, pulled = false, applyingRemote = false, pushTimer = null;

  /* ---------- localStorage helpers ---------- */
  const origSet = localStorage.setItem.bind(localStorage);
  const isAppKey = k => k && k.indexOf('prayerhub.') === 0;

  function gatherLocal() {
    const o = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (isAppKey(k)) { try { o[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {} }
    }
    return o;
  }

  // Patch setItem so any change to app data schedules a debounced push.
  localStorage.setItem = function (key, val) {
    origSet(key, val);
    if (!applyingRemote && isAppKey(key) && session) schedulePush();
  };

  /* ---------- merge (union; no data loss) ---------- */
  const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
  function deepMerge(a, b) {
    if (a === undefined) return b;
    if (b === undefined) return a;
    if (Array.isArray(a) && Array.isArray(b)) {
      const seen = new Set(), out = [];
      for (const x of [...a, ...b]) { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
      return out;
    }
    if (isObj(a) && isObj(b)) {
      const out = {};
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = deepMerge(a[k], b[k]);
      return out;
    }
    return b; // leaf conflict → prefer local (this device)
  }

  /* ---------- sync ---------- */
  function schedulePush() {
    setSync('syncing');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push(), 1200);
  }

  async function push(blob) {
    if (!client || !session) return;
    const data = blob || gatherLocal();
    setSync('syncing');
    const { error } = await client.from('user_state')
      .upsert({ user_id: session.user.id, data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    setSync(error ? 'error' : 'synced');
    if (error) console.warn('[PrayerHub] push failed:', error.message);
  }

  async function pull() {
    if (!client || !session) return;
    setSync('syncing');
    const { data: row, error } = await client.from('user_state')
      .select('data').eq('user_id', session.user.id).maybeSingle();
    if (error) { setSync('error'); console.warn('[PrayerHub] pull failed:', error.message); return; }
    const remote = (row && row.data) || {};
    const merged = deepMerge(remote, gatherLocal());
    applyingRemote = true;
    for (const k in merged) origSet(k, JSON.stringify(merged[k]));
    applyingRemote = false;
    await push(merged);                 // make sure the cloud has the union
    if (PH.app && PH.app.rehydrate) PH.app.rehydrate();
    setSync('synced');
  }

  /* ---------- auth ---------- */
  async function signIn(email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }
  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) return error.message;
    if (!data.session) return 'Account created — check your email to confirm, then sign in.';
    return null; // signed in immediately (email confirmation disabled)
  }
  async function signOut() { await client.auth.signOut(); }

  /* ---------- UI ---------- */
  function setSync(state) {
    const dot = $('syncDot'); if (!dot) return;
    dot.dataset.state = state;
    dot.title = { syncing: 'Syncing…', synced: 'Synced', error: 'Sync error', offline: 'Offline' }[state] || '';
  }

  function renderAuthArea() {
    const area = $('authArea'); if (!area) return;
    if (session) {
      const email = session.user.email || 'account';
      area.innerHTML = `<span class="sync-dot" id="syncDot" data-state="synced" title="Synced"></span>
        <span class="auth-email" title="${email}">${email}</span>
        <button class="btn btn--ghost" id="signOutBtn">Sign out</button>`;
      $('signOutBtn').addEventListener('click', signOut);
    } else {
      area.innerHTML = `<button class="btn btn--ghost" id="signInOpen">☁ Sign in</button>`;
      $('signInOpen').addEventListener('click', openModal);
    }
  }

  function openModal() { $('authModal').classList.remove('hidden'); $('authError').textContent = ''; $('authEmail').focus(); }
  function closeModal() { $('authModal').classList.add('hidden'); }

  function bindModal() {
    $('authClose').addEventListener('click', closeModal);
    $('authModal').addEventListener('click', e => { if (e.target.id === 'authModal') closeModal(); });
    const run = async (fn) => {
      const email = $('authEmail').value.trim(), pw = $('authPassword').value;
      if (!email || pw.length < 6) { $('authError').textContent = 'Enter an email and a password of at least 6 characters.'; return; }
      $('authError').textContent = 'Working…';
      const msg = await fn(email, pw);
      if (msg) { $('authError').textContent = msg; }
      else { closeModal(); PH.ui.toast('Signed in — your data is now syncing.'); }
    };
    $('authSignIn').addEventListener('click', () => run(signIn));
    $('authSignUp').addEventListener('click', () => run(signUp));
    $('authPassword').addEventListener('keydown', e => { if (e.key === 'Enter') run(signIn); });
  }

  /* ---------- init ---------- */
  function init() {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn('[PrayerHub] Supabase SDK not loaded — running local-only.');
      const area = $('authArea'); if (area) area.innerHTML = '';
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    bindModal();
    renderAuthArea();
    client.auth.onAuthStateChange((event, sess) => {
      session = sess;
      renderAuthArea();
      if (session && !pulled) { pulled = true; pull(); }
      if (!session) pulled = false;
    });
  }

  return { init, push, pull };
})();
