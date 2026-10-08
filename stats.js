// 打擊結果定義與統計（成績頁與記錄 App 共用）
window.FS = (function () {
  const RESULTS = [
    { label: "一壘安打", code: "1B", short: "一安", kind: "hit" },
    { label: "二壘安打", code: "2B", short: "二安", kind: "hit" },
    { label: "三壘安打", code: "3B", short: "三安", kind: "hit" },
    { label: "全壘打",   code: "HR", short: "全壘打", kind: "hit" },
    { label: "四壞球",   code: "BB", short: "四壞", kind: "on" },
    { label: "觸身球",   code: "HBP", short: "觸身", kind: "on" },
    { label: "失誤上壘", code: "E", short: "失誤", kind: "on" },
    { label: "野手選擇", code: "FC", short: "野選", kind: "on" },
    { label: "三振",     code: "K", short: "三振", kind: "out" },
    { label: "滾地出局", code: "GO", short: "滾地", kind: "out" },
    { label: "飛球出局", code: "FO", short: "飛球", kind: "out" },
    { label: "犧牲觸擊", code: "SH", short: "犧觸", kind: "out" },
    { label: "高飛犧牲打", code: "SF", short: "犧飛", kind: "out" }
  ];
  const BY_LABEL = Object.fromEntries(RESULTS.map(r => [r.label, r]));
  const NOT_AB = ["BB", "HBP", "SH", "SF"];
  const blank = () => ({ pa: 0, ab: 0, h: 0, rbi: 0, s: 0, d: 0, t: 0, hr: 0, roe: 0, so: 0, bb: 0, hbp: 0, sf: 0 });

  function tally(log) {
    const m = {};
    for (const r of log) {
      const def = BY_LABEL[r.result]; if (!def) continue;
      const p = m[r.name] || (m[r.name] = blank()), c = def.code;
      p.pa++; p.rbi += Number(r.rbi) || 0;
      if (!NOT_AB.includes(c)) p.ab++;
      if (c === "1B") { p.s++; p.h++; } else if (c === "2B") { p.d++; p.h++; }
      else if (c === "3B") { p.t++; p.h++; } else if (c === "HR") { p.hr++; p.h++; }
      else if (c === "BB") p.bb++; else if (c === "HBP") p.hbp++;
      else if (c === "E") p.roe++; else if (c === "K") p.so++; else if (c === "SF") p.sf++;
    }
    return m;
  }
  const gameKey = r => (r.date || "") + "|" + (r.opp || "");
  return { RESULTS, BY_LABEL, tally, blank, gameKey };
})();
