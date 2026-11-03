/* =====================================================================
 *  BRAIN : 북한군 학습 AI (브라우저·서버 공용)
 *  - 학습은 플레이어별이 아니라 서버의 단일 '전체 북한군 교리'에 누적됩니다.
 * ===================================================================== */
const BRAIN_SECTOR_NAME = ['서부(개성·문산 축선)', '중부(철원·평강 축선)', '동부(회양·고성 축선)'];
const AI_DEFAULT = { atkRatio: 0.95, counterRatio: 2.2, delayRatio: 0.45, retreatStr: 0.35, resCount: 4, resRange: 260, resOffset: 18,
  artRange: 85, conserveAt: 0.12, infilInterval: 5, stanceDay: 3, stanceLen: 10, mobInterval: 6 };
const AI_BOUNDS = { atkRatio: [0.6, 1.6], counterRatio: [1.3, 3.5], delayRatio: [0.25, 0.8], retreatStr: [0.15, 0.6], resCount: [2, 8],
  resRange: [150, 400], resOffset: [8, 35], artRange: [70, 110], conserveAt: [0.05, 0.3], infilInterval: [3, 9],
  stanceDay: [1, 6], stanceLen: [5, 20], mobInterval: [3, 10] };
const AI_INT = ['resCount', 'stanceDay'];
function brainGauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function brainKm(a1, o1, a2, o2) { const dy = (a1 - a2) * 111, dx = (o1 - o2) * 87.7; return Math.sqrt(dx * dx + dy * dy); }
function brainNew() { return { v: 3, gen: 0, best: null, know: { sector: [0, 0, 0], landings: [], airOps: 0, infilHit: [0, 0, 0, 0] } }; }
function clampParams(p) {
  const out = {};
  for (const k in AI_DEFAULT) {
    let v = Number(p && p[k]); if (!isFinite(v)) v = AI_DEFAULT[k];
    v = Math.max(AI_BOUNDS[k][0], Math.min(AI_BOUNDS[k][1], v));
    out[k] = AI_INT.includes(k) ? Math.round(v) : v;
  }
  return out;
}
function brainPrepare(B) {
  if (!B || !B.gen || !B.best) return Object.assign({}, AI_DEFAULT);
  const sig = Math.max(0.05, 0.22 / Math.sqrt(B.gen));
  const cur = {};
  for (const k in AI_DEFAULT) cur[k] = (B.best.params[k] != null ? B.best.params[k] : AI_DEFAULT[k]) * Math.exp(brainGauss() * sig);
  return clampParams(cur);
}
function brainSkill(B) { return B ? Math.min(0.08, (B.gen || 0) * 0.002) : 0; }
function kpaScoreFrom(r) {
  const sc = r.day * 0.4 + r.cas / 4000 + (1 - r.capFrac) * 60 + r.civ / 8000 + (r.result === 'lose' ? 100 : 0);
  return sc * ({ easy: 1.15, normal: 1, hard: 0.87 }[r.diff] || 1);
}
function sanitizeReport(r) {
  if (!r || typeof r !== 'object') return null;
  const num = (v, lo, hi) => { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; };
  const o = r.obs || {};
  const out = {
    diff: ['easy', 'normal', 'hard'].includes(r.diff) ? r.diff : null,
    result: ['win', 'lose', 'abort'].includes(r.result) ? r.result : null,
    day: num(r.day, 0, 2000), cas: num(r.cas, 0, 5e6), kia: num(r.kia, 0, 5e6), civ: num(r.civ, 0, 5e7), cost: num(r.cost, 0, 1e5),
    will: num(r.will, 0, 100), pow: num(r.pow, 0, 5e6), capFrac: num(r.capFrac, 0, 1), china: !!r.china,
    params: clampParams(r.params),
    obs: {
      sector: [0, 1, 2].map(i => num((o.sector || [])[i], 0, 1e7) || 0),
      landings: (Array.isArray(o.landings) ? o.landings : []).slice(0, 10)
        .map(l => [num(l && l[0], 33, 43.1), num(l && l[1], 124, 131)]).filter(l => l[0] != null && l[1] != null),
      airOps: num(o.airOps, 0, 100) || 0,
      infilHit: [0, 1, 2, 3].map(i => num((o.infilHit || [])[i], 0, 1e6) || 0),
    },
  };
  for (const k of ['diff', 'result', 'day', 'cas', 'civ', 'cost', 'will', 'pow', 'capFrac']) if (out[k] == null) return null;
  if (out.kia == null) out.kia = 0;
  return out;
}
function brainLearnReport(B, r) {
  const score = kpaScoreFrom(r);
  let improved = false;
  if (!B.best || score >= B.best.score) { B.best = { params: clampParams(r.params), score }; improved = true; }
  else B.best.score = B.best.score * 0.97 + score * 0.03;
  const o = r.obs, K = B.know, a = 0.2;
  const tot = o.sector[0] + o.sector[1] + o.sector[2];
  if (tot > 0) for (let i = 0; i < 3; i++) K.sector[i] = K.sector[i] * (1 - a) + (o.sector[i] / tot) * a;
  K.landings.forEach(l => l[2] *= 0.85);
  for (const [la, lo] of o.landings) {
    const ex = K.landings.find(l => brainKm(l[0], l[1], la, lo) < 45);
    if (ex) { ex[2] += 1; ex[0] = (ex[0] * 3 + la) / 4; ex[1] = (ex[1] * 3 + lo) / 4; } else K.landings.push([la, lo, 1]);
  }
  K.landings = K.landings.filter(l => l[2] > 0.25).sort((x, y) => y[2] - x[2]).slice(0, 6);
  K.airOps = K.airOps * (1 - a) + o.airOps * a;
  for (let i = 0; i < 4; i++) K.infilHit[i] = (K.infilHit[i] || 0) * (1 - a) + (o.infilHit[i] || 0) * a;
  B.gen = (B.gen || 0) + 1;
  return { improved, topSector: tot > 0 ? BRAIN_SECTOR_NAME[o.sector.indexOf(Math.max(...o.sector))] : null, landings: o.landings.length, airOps: o.airOps };
}
if (typeof module !== 'undefined') module.exports = { BRAIN_SECTOR_NAME, AI_DEFAULT, AI_BOUNDS, brainNew, brainPrepare, brainSkill, kpaScoreFrom, sanitizeReport, brainLearnReport, clampParams };
