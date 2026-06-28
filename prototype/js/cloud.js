/* ============================================================
   Salah OS — cloud sync (Supabase)
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
    if (error) console.warn('[Salah OS] push failed:', error.message);
  }

  async function pull() {
    if (!client || !session) return;
    setSync('syncing');
    const { data: row, error } = await client.from('user_state')
      .select('data').eq('user_id', session.user.id).maybeSingle();
    if (error) { setSync('error'); console.warn('[Salah OS] pull failed:', error.message); return; }
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
  // Email a password-reset link. The link returns to this app and fires a
  // PASSWORD_RECOVERY auth event (handled in init), which opens the modal in
  // "set a new password" mode.
  async function resetPassword(email) {
    const redirectTo = location.origin + location.pathname;
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
    return error ? error.message : null;
  }
  async function updatePassword(newPw) {
    const { error } = await client.auth.updateUser({ password: newPw });
    return error ? error.message : null;
  }
  // Social sign-in: a full-page redirect to the provider, then back to this app
  // (the SIGNED_IN auth event below picks up the session and syncs).
  async function oauth(provider) {
    const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } });
    if (error) PH.ui.toast(error.message);
  }

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
      const e = PH.esc(email);
      const initial = PH.esc((email[0] || 'U').toUpperCase());
      area.innerHTML = `<div class="acct">
        <button class="acct__btn" id="acctBtn" aria-haspopup="menu" aria-expanded="false" title="${e}">
          <span class="acct__avatar">${initial}</span>
          <span class="sync-dot" id="syncDot" data-state="synced" title="Synced"></span>
        </button>
        <div class="acct__menu hidden" id="acctMenu" role="menu">
          <div class="acct__id"><span class="acct__avatar acct__avatar--lg">${initial}</span><span class="acct__email" title="${e}">${e}</span></div>
          <button class="btn btn--ghost acct__signout" id="signOutBtn" role="menuitem">${PH.t('auth.signOut')}</button>
        </div>
      </div>`;
      const btn = $('acctBtn'), menu = $('acctMenu');
      btn.addEventListener('click', ev => { ev.stopPropagation(); const closed = menu.classList.toggle('hidden'); btn.setAttribute('aria-expanded', String(!closed)); });
      $('signOutBtn').addEventListener('click', signOut);
    } else {
      area.innerHTML = `<button class="btn btn--ghost btn--ico" id="signInOpen"><span class="material-symbols-outlined">cloud</span> ${PH.t('auth.signIn')}</button>`;
      $('signInOpen').addEventListener('click', openModal);
    }
  }

  let recovery = false;        // true while the user is setting a new password via a reset link
  let oauthAvailable = false;  // whether any social-login buttons are shown

  // Toggle the modal between normal sign-in and "set a new password" mode.
  function setMode(mode) {
    recovery = (mode === 'recovery');
    $('authEmail').style.display = recovery ? 'none' : '';
    $('authSignUp').style.display = recovery ? 'none' : '';
    $('authForgot').style.display = recovery ? 'none' : '';
    $('authFineprint').style.display = recovery ? 'none' : '';
    $('authOauth').style.display = (recovery || !oauthAvailable) ? 'none' : '';
    $('authDivider').style.display = (recovery || !oauthAvailable) ? 'none' : '';
    $('authTitle').textContent = recovery ? PH.t('auth.recoverTitle') : PH.t('auth.modalTitle');
    $('authSub').textContent = recovery ? PH.t('auth.recoverSub') : PH.t('auth.modalSub');
    $('authSignIn').textContent = recovery ? PH.t('auth.updatePw') : PH.t('auth.signIn');
    $('authPassword').setAttribute('placeholder', recovery ? PH.t('auth.newPw') : PH.t('auth.password'));
    $('authPassword').value = '';
    $('authError').textContent = '';
  }

  // Swap the modal body to a success panel (used for both "reset email sent"
  // and "password updated"), or back to the form.
  function showConfirm(title, sub) {
    $('authConfirmTitle').textContent = title;
    $('authConfirmSub').textContent = sub;
    $('authForm').classList.add('hidden');
    $('authConfirm').classList.remove('hidden');
    $('authConfirmDone').focus();
  }
  function resetModalView() { $('authConfirm').classList.add('hidden'); $('authForm').classList.remove('hidden'); }

  function openModal(mode) {
    resetModalView();
    setMode(mode === 'recovery' ? 'recovery' : 'default');
    $('authModal').classList.remove('hidden');
    (recovery ? $('authPassword') : $('authEmail')).focus();
  }
  function closeModal() { $('authModal').classList.add('hidden'); }

  function bindModal() {
    $('authClose').addEventListener('click', closeModal);
    $('authModal').addEventListener('click', e => { if (e.target.id === 'authModal') closeModal(); });
    // Close the account dropdown on any outside click (bound once).
    document.addEventListener('click', () => { const m = $('acctMenu'); if (m) m.classList.add('hidden'); });
    // Social sign-in buttons (shown per PH.config.oauthProviders).
    const providers = PH.config.oauthProviders || [];
    oauthAvailable = providers.length > 0;
    if (!providers.includes('google')) $('authGoogle').style.display = 'none';
    if (!providers.includes('apple')) $('authApple').style.display = 'none';
    $('authGoogle').addEventListener('click', () => oauth('google'));
    $('authApple').addEventListener('click', () => oauth('apple'));
    const run = async (fn) => {
      const email = $('authEmail').value.trim(), pw = $('authPassword').value;
      if (!email || pw.length < 6) { $('authError').textContent = PH.t('auth.needBoth'); return; }
      $('authError').textContent = PH.t('auth.working');
      const msg = await fn(email, pw);
      if (msg) { $('authError').textContent = msg; }
      else { closeModal(); PH.ui.toast(PH.t('auth.signedIn')); }
    };
    // Set a new password (recovery flow).
    const runUpdate = async () => {
      const pw = $('authPassword').value;
      if (pw.length < 6) { $('authError').textContent = PH.t('auth.pwShort'); return; }
      $('authError').textContent = PH.t('auth.working');
      const msg = await updatePassword(pw);
      if (msg) { $('authError').textContent = msg; }
      else { setMode('default'); showConfirm(PH.t('auth.pwUpdatedTitle'), PH.t('auth.pwUpdatedSub')); }
    };
    // Send a reset email.
    $('authForgot').addEventListener('click', async () => {
      const email = $('authEmail').value.trim();
      if (!email) { $('authError').textContent = PH.t('auth.needEmail'); $('authEmail').focus(); return; }
      $('authError').textContent = PH.t('auth.sending');
      const msg = await resetPassword(email);
      if (msg) { $('authError').textContent = msg; }
      else { showConfirm(PH.t('auth.resetSentTitle'), PH.t('auth.resetSent')); }
    });
    $('authConfirmDone').addEventListener('click', () => { resetModalView(); closeModal(); });
    $('authSignIn').addEventListener('click', () => recovery ? runUpdate() : run(signIn));
    $('authSignUp').addEventListener('click', () => run(signUp));
    $('authPassword').addEventListener('keydown', e => { if (e.key === 'Enter') (recovery ? runUpdate() : run(signIn)); });
  }

  /* ---------- init ---------- */
  function init() {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn('[Salah OS] Supabase SDK not loaded — running local-only.');
      const area = $('authArea'); if (area) area.innerHTML = '';
      return;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    bindModal();
    renderAuthArea();
    client.auth.onAuthStateChange((event, sess) => {
      session = sess;
      renderAuthArea();
      // Arrived back via a password-reset link → let the user set a new password.
      if (event === 'PASSWORD_RECOVERY') { openModal('recovery'); return; }
      if (session && !pulled) { pulled = true; pull(); }
      if (!session) pulled = false;
    });
  }

  return { init, push, pull };
})();
