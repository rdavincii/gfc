/* GFC game engine: pure functions over the club data. No DOM, no storage.
   Everything here is derived from what the club actually recorded, so nothing is invented:
   a player with no recorded match stats has stats of `null` ("Not recorded"), never 0.
   Change the numbers in DEFAULT_RULES (or the table in Game Center, which is saved in data.rules). */
(function (root) {
  'use strict';

  const DEFAULT_RULES = {
    player: { appearance: 50, goal: 100, assist: 75, cleanSheet: 75, potm: 100, training: 25 }, // XP per event
    club: { match: 40, win: 60, draw: 20, training: 15, recruit: 30 },                           // club XP per event
    playerLevelStep: 250, // XP needed to leave level L is playerLevelStep * L
    clubLevelStep: 300    // XP needed to leave club level L is clubLevelStep * L
  };
  const mergeRules = (r) => ({
    player: { ...DEFAULT_RULES.player, ...(r && r.player) },
    club: { ...DEFAULT_RULES.club, ...(r && r.club) },
    playerLevelStep: Number(r && r.playerLevelStep) > 0 ? Number(r.playerLevelStep) : DEFAULT_RULES.playerLevelStep,
    clubLevelStep: Number(r && r.clubLevelStep) > 0 ? Number(r.clubLevelStep) : DEFAULT_RULES.clubLevelStep
  });

  // Cosmetic and functional unlocks by club level. Edit this list to change rewards.
  // type 'pitch' = a formation pitch theme (applied in Tactics), 'badge' = a club frame, 'feature' = informational.
  const REWARDS = [
    { level: 1, id: 'pitch-classic', type: 'pitch', label: 'Classic pitch', note: 'The standard grass pitch.' },
    { level: 2, id: 'pitch-night', type: 'pitch', label: 'Night match pitch', note: 'A floodlit dark pitch for Tactics.' },
    { level: 3, id: 'frame-silver', type: 'badge', label: 'Silver club frame', note: 'Silver ring around the club badge on Home.' },
    { level: 4, id: 'pitch-crimson', type: 'pitch', label: 'Crimson pitch', note: 'A red GFC themed pitch.' },
    { level: 5, id: 'frame-gold', type: 'badge', label: 'Gold club frame', note: 'Gold ring around the club badge on Home.' },
    { level: 7, id: 'feature-history', type: 'feature', label: 'Veteran status', note: 'A badge for a club with a real history.' },
    { level: 10, id: 'frame-legend', type: 'badge', label: 'Legend frame', note: 'Animated ring around the club badge.' }
  ];

  const POS_GROUP = { GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', LW: 'ATT', RW: 'ATT', ST: 'ATT' };
  const OUTFIELD_ATTRS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
  const GK_ATTRS = ['diving', 'handling', 'kicking', 'reflexes', 'speed', 'positioning'];
  const attrKeys = (p) => (p && p.position === 'GK' ? GK_ATTRS : OUTFIELD_ATTRS);
  const isDefensive = (p) => ['GK', 'CB', 'LB', 'RB'].includes(p && p.position);

  const hasResult = (m) => m.home != null && m.away != null;
  const yearOf = (d) => String(d || '').slice(0, 4);
  const inSeason = (m, season) => !season || season === 'all' || yearOf(m.date) === String(season);
  const resultOf = (m) => (!hasResult(m) ? null : m.home > m.away ? 'W' : m.home < m.away ? 'L' : 'D');
  const dayNum = (d) => Math.floor(new Date(d + 'T00:00:00Z').getTime() / 864e5);
  const weekStart = (d) => { const n = dayNum(d); const dow = (n + 3) % 7; return new Date((n - dow) * 864e5).toISOString().slice(0, 10); }; // Monday

  function level(total, step) {
    let lv = 1, xp = Math.max(0, Math.round(total));
    while (xp >= step * lv) { xp -= step * lv; lv++; }
    const need = step * lv;
    return { level: lv, into: xp, need, pct: Math.round((xp * 100) / need), total: Math.round(total) };
  }

  // ---- Player stats and XP ----
  // Stats only exist once at least one match has recorded stats (m.stats). Before that they are null = "Not recorded".
  function playerStats(data, p, season) {
    const recorded = data.matches.filter((m) => m.stats && inSeason(m, season));
    const trained = (data.training || []).filter((t) => inSeason(t, season) && (t.attended || []).includes(p.id)).length;
    if (!recorded.length && !trained) return { recorded: false, apps: null, goals: null, assists: null, cleanSheets: null, potm: null, trainings: null, xp: 0, breakdown: [] };
    const s = { recorded: true, apps: 0, goals: 0, assists: 0, cleanSheets: 0, potm: 0, trainings: trained };
    for (const m of recorded) {
      const st = m.stats;
      if (!(st.played || []).includes(p.id)) continue;
      s.apps++;
      s.goals += Number(st.goals && st.goals[p.id]) || 0;
      s.assists += Number(st.assists && st.assists[p.id]) || 0;
      if (st.potm === p.id) s.potm++;
      if (hasResult(m) && m.away === 0 && isDefensive(p)) s.cleanSheets++;
    }
    const r = mergeRules(data.rules).player;
    s.breakdown = [['Appearances', s.apps, r.appearance], ['Goals', s.goals, r.goal], ['Assists', s.assists, r.assist], ['Clean sheets', s.cleanSheets, r.cleanSheet], ['Player of the match', s.potm, r.potm], ['Training', s.trainings, r.training]];
    s.xp = s.breakdown.reduce((n, [, c, x]) => n + c * x, 0);
    return s;
  }
  const playerLevel = (data, p) => level(playerStats(data, p).xp, mergeRules(data.rules).playerLevelStep);

  // XP a single recorded match gave: per player and for the club.
  function matchXp(data, m) {
    const r = mergeRules(data.rules), st = m.stats, per = [];
    let club = 0;
    if (hasResult(m)) club += r.club.match + (m.home > m.away ? r.club.win : m.home === m.away ? r.club.draw : 0);
    if (st) for (const id of st.played || []) {
      const p = data.squad.find((x) => x.id === id); if (!p) continue;
      const g = Number(st.goals && st.goals[id]) || 0, a = Number(st.assists && st.assists[id]) || 0;
      const cs = hasResult(m) && m.away === 0 && isDefensive(p) ? 1 : 0, pm = st.potm === id ? 1 : 0;
      per.push({ p, xp: r.player.appearance + g * r.player.goal + a * r.player.assist + cs * r.player.cleanSheet + pm * r.player.potm, g, a, cs, pm });
    }
    return { club, per: per.sort((x, y) => y.xp - x.xp), total: per.reduce((n, x) => n + x.xp, 0) };
  }

  // ---- Development (rating history) ----
  // p.history = [{date, ovr, attrs}] is appended by the app whenever a rating or attribute is saved.
  function development(p) {
    const h = (p.history || []).filter((x) => x.ovr != null);
    if (h.length < 2) return { from: h[0] ? h[0].ovr : null, to: h[0] ? h[0].ovr : null, delta: 0, trend: null, attrs: [] };
    const first = h[0], last = h[h.length - 1], attrs = [];
    for (const k of attrKeys(p)) { const a = first.attrs && first.attrs[k], b = last.attrs && last.attrs[k]; if (a != null && b != null) attrs.push({ key: k, from: a, to: b, delta: b - a }); }
    const prev = h[h.length - 2].ovr, d = last.ovr - prev;
    return { from: first.ovr, to: last.ovr, delta: last.ovr - first.ovr, trend: d > 0 ? 'up' : d < 0 ? 'down' : 'steady', attrs };
  }

  // ---- Position fit (transparent rule, no invented chemistry) ----
  // exact position = 'perfect'; same area of the pitch (GK/DEF/MID/ATT) = 'ok'; otherwise 'off'; no position set = null.
  function fit(slotLabel, position) {
    if (!position || !slotLabel) return null;
    if (slotLabel === position) return 'perfect';
    return POS_GROUP[slotLabel] && POS_GROUP[slotLabel] === POS_GROUP[position] ? 'ok' : 'off';
  }

  // ---- Team ratings ----
  // Each line of the formation counts as ATT / MID / DEF by its place in the shape (first number = defence, last = attack,
  // the rest = midfield; the GK joins defence). A line rating is the plain average of the rated players in it.
  // TEAM OVR = weighted average of the lines that have rated players: attack 0.3, midfield 0.35, defence 0.35.
  // Balance compares attack and defence: within 4 points = Balanced, otherwise attack- or defence-led.
  function teamRatings(roles, players) {
    const groups = { ATT: [], MID: [], DEF: [] }, all = [];
    for (const { role, player } of players) {
      if (!player || player.rating == null) continue;
      groups[role === 'GK' ? 'DEF' : role].push(player.rating); all.push(player.rating);
    }
    const avg = (a) => (a.length ? Math.round(a.reduce((n, x) => n + x, 0) / a.length) : null);
    const att = avg(groups.ATT), mid = avg(groups.MID), def = avg(groups.DEF);
    const W = { att: 0.3, mid: 0.35, def: 0.35 };
    let sum = 0, w = 0;
    for (const [k, v] of [['att', att], ['mid', mid], ['def', def]]) if (v != null) { sum += v * W[k]; w += W[k]; }
    const balance = att == null || def == null ? null : Math.abs(att - def) <= 4 ? 'Balanced' : att > def ? 'Attack-led' : 'Defence-led';
    return { ovr: w ? Math.round(sum / w) : null, att, mid, def, average: avg(all), rated: all.length, balance };
  }

  // ---- Achievements ----
  const cleanSheets = (data) => data.matches.filter((m) => hasResult(m) && m.away === 0).length;
  const goalsFor = (data) => data.matches.reduce((n, m) => n + (hasResult(m) ? m.home : 0), 0);
  const fullTeams = (data) => Object.values(data.lineups || {}).reduce((n, s) => n + ['A', 'B'].filter((k) => s[k] && Object.keys(s[k].slots).length >= s[k].size).length, 0);
  const bestGain = (data) => Math.max(0, ...data.squad.map((p) => development(p).delta));
  const ACHIEVEMENTS = [
    { id: 'first-match', icon: '⚽', name: 'First match', desc: 'Record your first result.', xp: 40, test: (d) => d.matches.some(hasResult) },
    { id: 'first-win', icon: '🏆', name: 'First win', desc: 'Win a match.', xp: 60, test: (d) => d.matches.some((m) => resultOf(m) === 'W') },
    { id: 'club-builder', icon: '🧱', name: 'Club builder', desc: 'Have 20 players in the squad.', xp: 50, test: (d) => d.squad.length >= 20 },
    { id: 'tactician', icon: '🧠', name: 'Tactician', desc: 'Complete 10 full line-ups.', xp: 80, test: (d) => fullTeams(d) >= 10 },
    { id: 'goal-machine', icon: '🔥', name: 'Goal machine', desc: 'Score 25 goals as a club.', xp: 100, test: (d) => goalsFor(d) >= 25 },
    { id: 'rising-star', icon: '⭐', name: 'Rising star', desc: 'Develop a player by +5 OVR.', xp: 80, test: (d) => bestGain(d) >= 5 },
    { id: 'iron-wall', icon: '🧤', name: 'Iron wall', desc: 'Keep 5 clean sheets.', xp: 100, test: (d) => cleanSheets(d) >= 5 },
    { id: 'legend', icon: '👑', name: 'Legend', desc: 'Reach club level 25.', xp: 250, test: (d) => clubLevel(d, true).level >= 25 },
    { id: 'art-director', icon: '🎨', name: 'Art director', desc: 'Give a match pack its own background.', xp: 40, test: (d) => Object.values(d.packs || {}).some((p) => p.bg) },
    { id: 'on-the-feed', icon: '📣', name: 'On the feed', desc: 'Export a poster.', xp: 30, test: (d) => d.progress.exports >= 1 },
    { id: 'card-designer', icon: '🃏', name: 'Card designer', desc: 'Create your own card template.', xp: 50, test: (d) => d.cardTemplates.length > 1 },
    { id: 'training-ground', icon: '🏃', name: 'Training ground', desc: 'Log your first training session.', xp: 30, test: (d) => (d.training || []).length >= 1 }
  ];

  // ---- Objectives: progress is always counted from recorded data ----
  const today = () => new Date().toISOString().slice(0, 10);
  const OBJECTIVES = [
    { id: 'd-train', cat: 'DAILY', title: "Record today's training", xp: 40, target: 1, value: (d, n) => (d.training || []).filter((t) => t.date === n).length },
    { id: 'd-attend', cat: 'DAILY', title: "Update today's attendance", xp: 30, target: 1, value: (d, n) => (d.training || []).filter((t) => t.date === n && (t.attended || []).length).length },
    { id: 'w-train', cat: 'WEEKLY', title: 'Complete 3 training sessions', xp: 120, target: 3, value: (d, n) => (d.training || []).filter((t) => weekStart(t.date) === weekStart(n)).length },
    { id: 'w-match', cat: 'WEEKLY', title: 'Record 1 match result', xp: 80, target: 1, value: (d, n) => d.matches.filter((m) => hasResult(m) && weekStart(m.date) === weekStart(n)).length },
    { id: 'w-formation', cat: 'WEEKLY', title: 'Create a matchday formation', xp: 60, target: 1, value: (d, n) => d.matches.filter((m) => m.date >= n && d.lineups[m.id] && ['A', 'B'].some((k) => d.lineups[m.id][k] && Object.keys(d.lineups[m.id][k].slots).length >= d.lineups[m.id][k].size)).length },
    { id: 's-wins', cat: 'SEASON', title: 'Reach 10 wins', xp: 200, target: 10, value: (d, n) => d.matches.filter((m) => yearOf(m.date) === yearOf(n) && resultOf(m) === 'W').length },
    { id: 's-develop', cat: 'SEASON', title: 'Develop 3 players', xp: 150, target: 3, value: (d, n) => d.squad.filter((p) => (p.history || []).some((h, i, a) => i && yearOf(h.date) === yearOf(n) && h.ovr > a[i - 1].ovr)).length },
    { id: 's-goals', cat: 'SEASON', title: 'Score 20 goals', xp: 200, target: 20, value: (d, n) => d.matches.filter((m) => yearOf(m.date) === yearOf(n)).reduce((a, m) => a + (hasResult(m) ? m.home : 0), 0) },
    { id: 'c-recruit', cat: 'CLUB', title: 'Register 3 new players', xp: 100, target: 3, value: (d) => d.squad.filter((p) => p.joined).length },
    { id: 'c-level', cat: 'CLUB', title: 'Reach club level 5', xp: 150, target: 5, value: (d) => clubLevel(d, true).level },
    { id: 'p-attrs', cat: 'PLAYER', title: 'Add attributes for 5 players', xp: 80, target: 5, value: (d) => d.squad.filter((p) => p.attrs && Object.keys(p.attrs).length).length },
    { id: 'p-rated', cat: 'PLAYER', title: 'Rate every player', xp: 80, target: (d) => d.squad.length, value: (d) => d.squad.filter((p) => p.rating != null).length }
  ];
  // The claim key repeats each period: daily = date, weekly = Monday of the week, season = year, club/player = once.
  const periodKey = (o, n) => o.cat === 'DAILY' ? n : o.cat === 'WEEKLY' ? weekStart(n) : o.cat === 'SEASON' ? yearOf(n) : 'once';
  function objectives(data, now) {
    now = now || today();
    return OBJECTIVES.map((o) => {
      const target = typeof o.target === 'function' ? o.target(data) : o.target, value = Math.min(o.value(data, now), target), key = o.id + ':' + periodKey(o, now);
      const claimed = !!(data.progress.claimed && data.progress.claimed[key]);
      return { id: o.id, cat: o.cat, title: o.title, xp: o.xp, target, value, key, done: target > 0 && value >= target, claimed };
    });
  }

  // ---- Club XP and level ----
  function clubXpBreakdown(data) {
    const r = mergeRules(data.rules).club, res = data.matches.filter(hasResult);
    const rows = [
      ['Matches played', res.length, r.match], ['Wins', res.filter((m) => resultOf(m) === 'W').length, r.win], ['Draws', res.filter((m) => resultOf(m) === 'D').length, r.draw],
      ['Training sessions', (data.training || []).length, r.training], ['Players recruited', data.squad.filter((p) => p.joined).length, r.recruit]
    ].map(([label, n, per]) => ({ label, n, per, xp: n * per }));
    const claimed = Object.values(data.progress.claimed || {}).reduce((n, c) => n + (c.xp || 0), 0);
    const ach = Object.keys(data.progress.unlocked || {}).reduce((n, id) => n + ((ACHIEVEMENTS.find((a) => a.id === id) || {}).xp || 0), 0);
    rows.push({ label: 'Objectives claimed', n: Object.keys(data.progress.claimed || {}).length, per: null, xp: claimed }, { label: 'Achievements', n: Object.keys(data.progress.unlocked || {}).length, per: null, xp: ach }, { label: 'Posters exported', n: data.progress.exports, per: 10, xp: data.progress.exports * 10 });
    return rows;
  }
  // `light` skips achievement XP so achievement tests that need the level cannot loop forever.
  function clubLevel(data, light) {
    const rows = clubXpBreakdown(light ? { ...data, progress: { ...data.progress, unlocked: {} } } : data);
    return level(rows.reduce((n, x) => n + x.xp, 0), mergeRules(data.rules).clubLevelStep);
  }
  const unlockedRewards = (lv) => REWARDS.filter((r) => r.level <= lv);

  // ---- Analytics (real recorded data only) ----
  function analytics(data, season) {
    const res = data.matches.filter((m) => hasResult(m) && inSeason(m, season)).sort((a, b) => a.date.localeCompare(b.date));
    const w = res.filter((m) => resultOf(m) === 'W').length, d = res.filter((m) => resultOf(m) === 'D').length, l = res.filter((m) => resultOf(m) === 'L').length;
    const gf = res.reduce((n, m) => n + m.home, 0), ga = res.reduce((n, m) => n + m.away, 0);
    const rows = data.squad.map((p) => ({ p, s: playerStats(data, p, season) })).filter((x) => x.s.recorded);
    const top = (k) => rows.filter((x) => x.s[k] > 0).sort((a, b) => b.s[k] - a.s[k]).slice(0, 5);
    const sessions = (data.training || []).filter((t) => inSeason(t, season));
    const seasons = [...new Set([...data.matches.map((m) => yearOf(m.date)), ...(data.training || []).map((t) => yearOf(t.date))].filter(Boolean))].sort();
    return {
      played: res.length, w, d, l, gf, ga, winPct: res.length ? Math.round((w * 100) / res.length) : null, cleanSheets: res.filter((m) => m.away === 0).length,
      scorers: top('goals'), assisters: top('assists'), apps: top('apps'), trainings: sessions.length,
      attendance: sessions.length ? Math.round((sessions.reduce((n, t) => n + (t.attended || []).length, 0) / sessions.length) * 10) / 10 : null,
      form: res.slice(-8).map(resultOf), seasons, developed: data.squad.map((p) => ({ p, dev: development(p) })).filter((x) => x.dev.delta !== 0).sort((a, b) => b.dev.delta - a.dev.delta)
    };
  }

  // ---- Card state badges ----
  function cardStates(data, p, captainIds) {
    const out = [], dev = development(p);
    const recorded = data.matches.filter((m) => m.stats).sort((a, b) => a.date.localeCompare(b.date));
    if (captainIds && captainIds.includes(p.id)) out.push('captain');
    if (recorded.length && recorded[recorded.length - 1].stats.potm === p.id) out.push('potm');
    const form = recorded.slice(-3).reduce((n, m) => n + (Number(m.stats.goals && m.stats.goals[p.id]) || 0) + (Number(m.stats.assists && m.stats.assists[p.id]) || 0), 0);
    if (form >= 2) out.push('in-form');
    if (dev.delta > 0) out.push('improved');
    return out;
  }

  root.GFC_GAME = { DEFAULT_RULES, mergeRules, REWARDS, ACHIEVEMENTS, OBJECTIVES, POS_GROUP, OUTFIELD_ATTRS, GK_ATTRS, attrKeys, isDefensive, hasResult, resultOf, level, playerStats, playerLevel, matchXp, development, fit, teamRatings, objectives, clubLevel, clubXpBreakdown, unlockedRewards, analytics, cardStates, weekStart, yearOf };
  if (typeof module !== 'undefined') module.exports = root.GFC_GAME;
})(typeof window !== 'undefined' ? window : globalThis);
