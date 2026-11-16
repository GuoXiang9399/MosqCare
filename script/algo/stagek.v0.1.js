// ================= MosqStageK v0.1 阶段特异热常数 / 密度因子（v3.7 新增，无 DOM 依赖） =================
/* ---------- 接口（纯函数） ----------
 * MosqStageK.stageStats(cages, T0)  → {need:3, stages:[{stage, n, Dbar, Tbar, K}]}
 *     阶段特异热常数：对同品系已结束蚊笼按 stage 记录序列切出各阶段日期区间，
 *     每笼每阶段计算历期 D（天）与实测均温 T̄_j（MosqForecast.dailyTemps 限制区间、仅实测日）；
 *     n≥3 的阶段输出 D̄（平均历期）、T̄̄（跨笼平均温度）与 K_j = D̄_j × (T̄̄_j − T0)。
 *     T0 由调用方提供（本地校准值优先，否则文献值）；T0 为空或 T̄̄ ≤ T0 时 K 输出 null。
 *     诚实边界：无阶段特异 T₀，K 仅作品系内阶段间比较，不可跨品系外插。
 * MosqStageK.densityCorr(cages)     → {need:5, n, rDur, rSurv, weakDur, weakSurv}
 *     密度因子探索：同品系已结束笼，起始卵量 vs 卵→成虫总历期 / 累积存活率 的 Pearson r；
 *     n≥5 才输出，|r|<0.3 标 weak（⚠）。
 *     诚实边界：笼级密度以起始卵量近似（无单位面积密度），相关性探索非因果。
 * 算法注册：MosqAlgo.register('stagek', '0.1', MosqStageK)
 */
var MosqStageK = (function(){
  // Pearson 相关系数（保留 3 位小数；方差为零返回 null）
  function pearson(pairs){
    var n = pairs.length; if (n < 2) return null;
    var sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
    pairs.forEach(function(p){ sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; syy += p[1] * p[1]; sxy += p[0] * p[1]; });
    var vx = sxx - sx * sx / n, vy = syy - sy * sy / n, cov = sxy - sx * sy / n;
    if (!(vx > 0) || !(vy > 0)) return null;
    return Math.round(cov / Math.sqrt(vx * vy) * 1000) / 1000;
  }
  function stageStats(cages, T0){
    var segs = {};   // stage → [{D, T}]（每笼每阶段一条）
    (cages || []).forEach(function(b){
      var st = (b.records || []).filter(function(r){ return r.t === 'stage'; });
      for (var i = 1; i < st.length; i++){
        var D = MosqForecast.daysBetween(st[i - 1].d, st[i].d);
        if (D < 1) continue;
        // 阶段区间 [st[i-1].d, st[i].d)：起点为进入该阶段当日，终点日归属下一阶段
        var days = MosqForecast.dailyTemps(b, st[i].d).days.filter(function(x){
          return !x.est && x.d >= st[i - 1].d && x.d < st[i].d;
        });
        if (!days.length) continue;
        var T = days.reduce(function(s, x){ return s + x.t; }, 0) / days.length;
        var stage = st[i - 1].to;
        (segs[stage] = segs[stage] || []).push({D:D, T:T});
      }
    });
    var stages = [];
    Object.keys(segs).forEach(function(stage){
      var arr = segs[stage];
      if (arr.length < 3) return;   // 样本不足：不出数（诚实拒绝）
      var Dbar = arr.reduce(function(s, x){ return s + x.D; }, 0) / arr.length;
      var Tbar = arr.reduce(function(s, x){ return s + x.T; }, 0) / arr.length;
      stages.push({stage:stage, n:arr.length, Dbar:Math.round(Dbar * 10) / 10, Tbar:Math.round(Tbar * 10) / 10,
        K:(typeof T0 === 'number' && Tbar > T0) ? Math.round(Dbar * (Tbar - T0) * 10) / 10 : null});
    });
    stages.sort(function(a, b){
      var seq = (typeof MosqForecast !== 'undefined' && MosqForecast.STAGE_SEQ) ? MosqForecast.STAGE_SEQ : [];
      return seq.indexOf(a.stage) - seq.indexOf(b.stage);
    });
    return {need:3, stages:stages};
  }
  function densityCorr(cages){
    var dur = [], surv = [];
    (cages || []).forEach(function(b){
      if (!b.eggs) return;
      var rec = (b.records || []).find(function(r){ return r.t === 'stage' && r.to === '成虫期'; });
      if (rec){
        var D = MosqForecast.daysBetween(b.start, rec.d);
        if (D >= 3) dur.push([b.eggs, D]);   // 卵→成虫总历期（至少 3 天才有意义）
      }
      if (b.result && b.result.finalCount > 0) surv.push([b.eggs, b.result.finalCount / b.eggs * 100]);
    });
    var out = {need:5, n:Math.max(dur.length, surv.length), rDur:null, rSurv:null, weakDur:false, weakSurv:false};
    if (dur.length >= 5){ out.rDur = pearson(dur); out.weakDur = out.rDur !== null && Math.abs(out.rDur) < 0.3; }
    if (surv.length >= 5){ out.rSurv = pearson(surv); out.weakSurv = out.rSurv !== null && Math.abs(out.rSurv) < 0.3; }
    return out;
  }
  return {stageStats:stageStats, densityCorr:densityCorr};
})();
if (typeof MosqAlgo !== 'undefined') MosqAlgo.register('stagek', '0.1', MosqStageK);
