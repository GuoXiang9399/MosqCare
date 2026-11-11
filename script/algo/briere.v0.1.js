// ================= MosqCare v3.4 Brière 发育速率拟合（v0.1） =================
// 输入 MosqForecast.calibrateStrain 的样本 {id, T(平均温度℃), D(发育历期天), r(=1/D)}，
// 拟合 Brière 模型 r(T) = c · T · (T − T₀) · (T_L − T)^0.5（T₀ ≤ T ≤ T_L）。
// 实现：对 (T₀, T_L) 做 0.5℃ 网格搜索；每组给定 (T₀, T_L) 时 x = T(T−T₀)(T_L−T)^0.5，
// c 为过原点最小二乘解析解 c = Σ(x·r)/Σ(x²)，取 r² 最大组合。
// 相关性参考而非因果预测；仅在 [T₀, T_L] 区间内有效，样本不足时诚实拒绝拟合。
var MosqBriere = (function(){
  'use strict';
  var MIN_N = 4;        // 有效样本门槛
  var MIN_SPAN = 5;     // 样本温度跨度门槛（℃）
  var STEP = 0.5;       // 网格步长（经验值，属启发式搜索而非全局最优证明）
  var T0_MAX = 20;      // T₀ 网格上限（℃）
  var TL_MAX = 42;      // T_L 网格上限（℃）
  var WEAK_R2 = 0.5;    // r² 低于此值标记 weak

  function round1(x){ return Math.round(x * 10) / 10; }
  function round4(x){ return Math.round(x * 10000) / 10000; }

  // 单组 (T0, TL) 的过原点最小二乘拟合，返回 {c, r2} 或 null（不可拟合）
  function solveAt(samples, T0, TL){
    var sxr = 0, sxx = 0, ok = true;
    for (var i = 0; i < samples.length; i++){
      var T = samples[i].T, r = samples[i].r;
      if (T < T0 || T > TL){ ok = false; break; } // 所有样本须落入 [T0, TL]
      var base = TL - T;
      if (base < 0) { ok = false; break; }
      var x = T * (T - T0) * Math.sqrt(base);
      if (!isFinite(x) || x <= 0){ ok = false; break; }
      sxr += x * r; sxx += x * x;
    }
    if (!ok || sxx <= 0) return null;
    var c = sxr / sxx;
    if (!(c > 0)) return null;
    // r²（相对均值基线；SStot=0 判无效）
    var sse = 0, sst = 0, rBar = 0;
    for (var j = 0; j < samples.length; j++) rBar += samples[j].r;
    rBar /= samples.length;
    for (var k = 0; k < samples.length; k++){
      var T2 = samples[k].T;
      var x2 = T2 * (T2 - T0) * Math.sqrt(TL - T2);
      var rhat = c * x2;
      sse += Math.pow(samples[k].r - rhat, 2);
      sst += Math.pow(samples[k].r - rBar, 2);
    }
    if (!(sst > 0)) return null;
    return {c: c, r2: 1 - sse / sst};
  }

  // 主入口：samples 为 calibrateStrain().samples（{id,T,D,r}）
  function fit(samples){
    samples = (samples || []).filter(function(s){ return isFinite(s.T) && isFinite(s.r) && s.r > 0; });
    var n = samples.length;
    if (!n) return {ok: false, n: 0, span: 0, reason: 'insufficient'};
    var minT = Infinity, maxT = -Infinity;
    samples.forEach(function(s){ minT = Math.min(minT, s.T); maxT = Math.max(maxT, s.T); });
    var span = Math.round((maxT - minT) * 10) / 10;
    if (n < MIN_N || span < MIN_SPAN){
      return {ok: false, n: n, span: span, reason: 'insufficient', needN: MIN_N, needSpan: MIN_SPAN};
    }
    var best = null;
    var t0Hi = Math.min(T0_MAX, minT - STEP);
    var tlLo = maxT + STEP;
    for (var T0 = 0; T0 <= t0Hi + 1e-9; T0 += STEP){
      for (var TL = tlLo; TL <= TL_MAX + 1e-9; TL += STEP){
        var s = solveAt(samples, T0, TL);
        if (s && (!best || s.r2 > best.r2)) best = {T0: T0, TL: TL, c: s.c, r2: s.r2};
      }
    }
    if (!best) return {ok: false, n: n, span: span, reason: 'insufficient', needN: MIN_N, needSpan: MIN_SPAN};
    var curve = samples.map(function(s){
      var x = s.T * (s.T - best.T0) * Math.sqrt(best.TL - s.T);
      return {T: s.T, r: s.r, rhat: round4(best.c * x)};
    });
    return {
      ok: true, n: n, span: span,
      c: round4(best.c), T0: round1(best.T0), TL: round1(best.TL),
      r2: round4(best.r2), weak: best.r2 < WEAK_R2,
      curve: curve, reason: best.r2 < WEAK_R2 ? 'weak' : ''
    };
  }

  return {fit: fit, MIN_N: MIN_N, MIN_SPAN: MIN_SPAN};
})();
if (typeof MosqAlgo !== 'undefined') MosqAlgo.register('briere', '0.1', MosqBriere);
