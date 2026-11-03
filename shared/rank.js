/* =====================================================================
 *  RANK : 명예의 전당(승전 랭킹) + 닉네임 검증 (브라우저·서버 공용)
 * ===================================================================== */
const RANK_SIZE = 10;
const RANK_CATS = [
  { key: 'score', name: '종합 전공 점수', desc: '기간·비용·피해·지지도·포로를 종합하고 난이도 가중치를 적용한 점수', dir: -1, fmt: v => v.toLocaleString('ko-KR') + '점' },
  { key: 'days', name: '최단 기간 통일', desc: '개전부터 통일까지 걸린 일수', dir: 1, fmt: v => v + '일' },
  { key: 'cost', name: '최소 전쟁 비용', desc: '종전 시점의 전쟁 직접비용', dir: 1, fmt: v => v.toFixed(1) + '조 원' },
  { key: 'civ', name: '최소 민간인 피해', desc: '종전 시점의 누적 민간인 피해', dir: 1, fmt: v => v.toLocaleString('ko-KR') + '명' },
  { key: 'cas', name: '최소 국군 사상자', desc: '전사·부상·실종을 합한 국군 사상자', dir: 1, fmt: v => v.toLocaleString('ko-KR') + '명' },
  { key: 'kia', name: '최소 국군 전사자', desc: '국군 전사자 수', dir: 1, fmt: v => v.toLocaleString('ko-KR') + '명' },
  { key: 'will', name: '최고 종전 국민 지지도', desc: '통일 시점의 국민 지지도', dir: -1, fmt: v => v.toFixed(1) },
  { key: 'pow', name: '최다 포로 획득', desc: '투항·포위로 획득한 포로 수', dir: -1, fmt: v => v.toLocaleString('ko-KR') + '명' },
  { key: 'nochina', name: '중국 개입 없는 최단 통일', desc: '중국군 참전 없이 통일한 기록 중 최단 기간', dir: 1, field: 'days', filter: e => !e.china, fmt: v => v + '일' },
];
const DIFF_NAME = { easy: '쉬움', normal: '보통', hard: '어려움' };
function rankScore(e) {
  const mult = { easy: 0.8, normal: 1, hard: 1.3 }[e.diff] || 1;
  const base = 8000 - e.days * 15 - e.cost * 6 - e.cas / 150 - e.civ / 100 + e.will * 30 + e.pow / 250;
  return Math.max(0, Math.round(base * mult));
}
function makeEntry(r, t) {
  const e = { diff: r.diff, days: Math.round(r.day), cost: Math.round(r.cost * 10) / 10, civ: Math.round(r.civ), cas: Math.round(r.cas),
    kia: Math.round(r.kia || 0), will: Math.round(r.will * 10) / 10, pow: Math.round(r.pow), china: !!r.china, t: t || Date.now() };
  e.score = rankScore(e);
  return e;
}
function rankCmp(cat) { const f = cat.field || cat.key; return (a, b) => (cat.dir * (a[f] - b[f])) || (a.t - b.t); }
function rankTop(entries, catKey, board) {
  const cat = RANK_CATS.find(c => c.key === catKey);
  return entries.filter(e => (board === 'all' || e.diff === board) && (!cat.filter || cat.filter(e))).sort(rankCmp(cat)).slice(0, RANK_SIZE);
}
function rankQualify(entries, e) {
  const out = [];
  for (const cat of RANK_CATS) {
    if (cat.filter && !cat.filter(e)) continue;
    for (const board of ['all', e.diff]) {
      const top = rankTop(entries, cat.key, board);
      if (top.length < RANK_SIZE || rankCmp(cat)(e, top[top.length - 1]) < 0) { out.push(cat.name); break; }
    }
  }
  return out;
}
function rankPrune(entries) {
  const keep = new Set();
  for (const cat of RANK_CATS) for (const board of ['all', 'easy', 'normal', 'hard']) rankTop(entries, cat.key, board).forEach(e => keep.add(e));
  return entries.filter(e => keep.has(e));
}
function normNick(s) {
  return String(s).normalize('NFKC').toLowerCase().replace(/[^0-9a-z@\u3131-\u318e\uac00-\ud7a3]/g, '')
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/5/g, 's').replace(/@/g, 'a');
}
function parseBanned(text) {
  return String(text || '').split(/\r?\n/).map(s => s.replace(/#.*/, '').trim()).filter(Boolean).map(normNick).filter(Boolean);
}
function nicknameError(nick, banned) {
  const s = String(nick || '').trim(), len = Array.from(s).length;
  if (len < 1) return '닉네임을 입력하십시오.';
  if (len > 12) return '닉네임은 12자 이내로 입력하십시오.';
  if (!/^[0-9A-Za-z\u3131-\u318e\uac00-\ud7a3 _\-.]+$/.test(s)) return '한글·영문·숫자와 공백, _ - . 만 사용할 수 있습니다.';
  const n = normNick(s);
  if (!n) return '한글·영문·숫자를 1자 이상 포함하십시오.';
  for (const w of banned || []) if (w && n.includes(w)) return '사용할 수 없는 단어가 포함되어 있습니다.';
  return null;
}
if (typeof module !== 'undefined') module.exports = { RANK_CATS, RANK_SIZE, DIFF_NAME, rankScore, makeEntry, rankTop, rankQualify, rankPrune, parseBanned, nicknameError };
