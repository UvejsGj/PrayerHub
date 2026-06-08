/* ============================================================
   PrayerHub — Family module
   A shared family dashboard: members, a weekly prayer goal, a
   family streak, and a leaderboard. "You" reflects your REAL
   tracked prayers this week; sample members illustrate sharing.
   (A real multi-user backend is described in the blueprint.)
   ============================================================ */
PH.family = (function () {
  const $ = id => document.getElementById(id);
  const KEY = 'prayerhub.family.v1';
  const GOAL_PER_MEMBER = 35; // 5 prayers × 7 days
  let bound = false;

  function seed() {
    return {
      name: 'My Family',
      streak: 12,
      members: [
        { id: 'you', name: 'You', role: 'leader', you: true, color: '#10b981' },
        { id: 'm2', name: 'Amina', role: 'member', weekly: 33, color: '#0ea5e9' },
        { id: 'm3', name: 'Yusuf', role: 'child', weekly: 26, color: '#6366f1' },
        { id: 'm4', name: 'Bilal', role: 'member', weekly: 29, color: '#f5c451' },
      ],
    };
  }
  // Returns { fam, dirty }. Dedupes members by id so the cloud blob-merge
  // (which unions arrays) can never produce duplicate members.
  function load() {
    let f = null;
    try { f = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!f || !Array.isArray(f.members)) return { fam: seed(), dirty: true };
    const seen = new Set(), before = f.members.length;
    f.members = f.members.filter(m => m && m.id && !seen.has(m.id) && seen.add(m.id));
    return { fam: f, dirty: f.members.length !== before };
  }
  function save(f) { localStorage.setItem(KEY, JSON.stringify(f)); }

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const roleLabel = r => PH.t('role.' + r);

  function youWeekly() {
    try { return PH.track.dailySeries(7).values.reduce((a, b) => a + b, 0); } catch (e) { return 0; }
  }

  function render() {
    const { fam, dirty } = load();
    if (dirty) save(fam); // persist the seeded/de-duped roster

    // your real weekly count
    const you = fam.members.find(m => m.you);
    if (you) you.weekly = youWeekly();

    $('familyName').textContent = fam.name;
    $('famCount').textContent = fam.members.length;
    $('famStreak').textContent = fam.streak;

    const total = fam.members.reduce((a, m) => a + (m.weekly || 0), 0);
    const goal = fam.members.length * GOAL_PER_MEMBER;
    $('famGoalText').textContent = `${total} / ${goal}`;
    $('famGoalBar').style.width = Math.min(100, (total / goal) * 100) + '%';
    $('famGoalSub').textContent = `${Math.round((total / goal) * 100)}% ${PH.t('fam.ofGoal')}`;

    const ranked = [...fam.members].sort((a, b) => (b.weekly || 0) - (a.weekly || 0));
    $('famBoard').innerHTML = ranked.map((m, i) => {
      const pct = Math.min(100, ((m.weekly || 0) / GOAL_PER_MEMBER) * 100);
      const rank = `<span class="fam-rank ${i < 3 ? 'fam-rank--' + (i + 1) : ''}">${i + 1}</span>`;
      return `<div class="fam-row glass-soft ${m.you ? 'is-you' : ''}">
        ${rank}
        <span class="fam-avatar" style="background:${m.color}">${esc(m.name[0])}</span>
        <div class="fam-row__main">
          <strong>${esc(m.name)}${m.you ? ` <span class="muted">(${PH.t('fam.you')})</span>` : ''}</strong>
          <span class="fam-badge fam-badge--${m.role}">${roleLabel(m.role)}</span>
        </div>
        <div class="fam-row__bar"><span style="width:${pct}%;background:${m.color}"></span></div>
        <strong class="fam-row__num">${m.weekly || 0}</strong>
      </div>`;
    }).join('');

    if (!bound) {
      bound = true;
      $('familyInvite').addEventListener('click', invite);
    }
  }

  function invite() {
    const code = 'PH-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const link = `${location.origin}${location.pathname}?join=${code}`;
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
    PH.ui.toast(`Invite code ${code} copied — share it to add a member.`);
  }

  return { render };
})();
