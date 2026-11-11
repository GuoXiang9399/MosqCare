// ================= MosqForecast v0.1 饲养结果预测套件（v3.3 新增，无 DOM 依赖） =================
/* ---------- 接口（纯函数） ----------
 * MosqForecast.SPECIES_PARAMS          → 内置文献热常数表（按拉丁名子串匹配）
 * MosqForecast.paramsFor(latin)        → {T0, K, udt, ref, note} | null
 * MosqForecast.dailyTemps(b, endDate)  → {days:[{d, t, est}], covered, total, mean}
 *     按日聚合环境记录温度：缺失日顺延前一日实测均值；连续缺失超过 3 天或无前值时
 *     按 26℃ 假设计入（FAO/IAEA 常规饲养 26±1℃），est=true 标记非实测日。
 * MosqForecast.forecastCage(b, params, today) → {ok, gdd, remain, K, progress, actual, dev,
 *     rate, etaDate, etaDays, coverage, elapsed, stageIdx, status, ...}
 *     线性积温模型：GDD = Σ max(0, min(T̄日, 上限) − T₀)；status ∈
 *     done | imminent | normal | ahead | ahead_severe | behind | behind_severe
 * MosqForecast.calibrateStrain(closed) → {n, samples, ok, T0, K}
 *     本地校准：对同品系已结束蚊笼做 1/D × T̄ 线性回归（1/D = (T̄ − T₀)/K），n≥6 启用。
 * MosqForecast.yieldByStrain(closed)   → {n, rates, ok, p10, p50, p90}
 *     羽化产量区间：同品系已结束笼累积存活率（终末成虫/起始卵）P10/P50/P90，n≥10 输出。
 * 算法注册：MosqAlgo.register('forecast', '0.1', MosqForecast)
 */
var MosqForecast = (function(){
  var STAGE_SEQ = ['卵期','L1期','L2期','L3期','L4期','蛹期','成虫期'];
  var FALLBACK_T = 26;   // 环境记录缺失时的假设温度（℃）
  var CARRY_MAX = 3;     // 顺延前值最大天数，超过按 26℃ 假设
  // —— 内置文献热常数（K 为卵→成虫全未成熟期有效积温，日·度；出处见 v3.3 调研报告 §1.3） ——
  // 株间/地理株差异可达 ±20–30%，文献值仅作默认，建议本地校准覆盖
  var SPECIES_PARAMS = [
    {key:'aegypti',    T0:8.3,   K:181.2, udt:null, ref:'Tun-Lin 2000',  note:'卵→成虫全未成熟期（K = 181.2±36.1 日·度，幼虫饲料影响大）'},
    {key:'albopictus', T0:10.37, K:175.6, udt:null, ref:'Pasquali 2020', note:'K = 幼虫期 105.26（Pasquali 2020）+ 卵/蛹期假设补偿约 70.3（26℃ 下卵约 2.5 天、蛹约 2 天的时长假设并入，非直接实测）'},
    {key:'stephensi',  T0:8.19,  K:187.7, udt:38,   ref:'Abbasi 2023',   note:'卵→成虫全未成熟期（K = 187.7±56.3 日·度）；上限发育温度 38℃ 截断'},
    {key:'pipiens',    T0:5.35,  K:193,   udt:null, ref:'Loetti 2011',   note:'尖音库蚊复合群雌雄均值（T₀ 5.2–5.5℃ / K 186.5–199.5 日·度）'}
  ];
  function pad2(n){ return n < 10 ? '0' + n : '' + n; }
  function dateStr(dt){ return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate()); }
  function daysBetween(d1, d2){
    if (!d1 || !d2) return 0;
    return Math.max(0, Math.round((new Date(d2 + 'T00:00:00') - new Date(d1 + 'T00:00:00')) / 86400000));
  }
  function addDays(dstr, n){
    var dt = new Date(dstr + 'T00:00:00'); dt.setDate(dt.getDate() + n);
    return dateStr(dt);
  }
  function paramsFor(latin){
    var s = String(latin || '');
    for (var i = 0; i < SPECIES_PARAMS.length; i++){
      if (s.indexOf(SPECIES_PARAMS[i].key) >= 0) return SPECIES_PARAMS[i];
    }
    return null;
  }
  function effT(t, udt){ return Math.min(t, udt == null ? Infinity : udt); }
  // ---- 按日聚合环境温度（缺失日顺延前值，超限按 26℃ 假设） ----
  function dailyTemps(b, endDate){
    var byDay = {};
    (b.records || []).forEach(function(r){
      if (r.t === 'env' && typeof r.temp === 'number' && r.d){
        if (!byDay[r.d]) byDay[r.d] = {s:0, n:0};
        byDay[r.d].s += r.temp; byDay[r.d].n++;
      }
    });
    var days = [], covered = 0, total = 0, last = null, gap = 999;
    if (b.start && endDate){
      var d0 = new Date(b.start + 'T00:00:00'), d1 = new Date(endDate + 'T00:00:00');
      for (var t = d0.getTime(); t <= d1.getTime(); t += 86400000){
        var ds = dateStr(new Date(t));
        total++;
        var rec = byDay[ds];
        if (rec){
          last = rec.s / rec.n; covered++; gap = 0;
          days.push({d:ds, t:Math.round(last * 10) / 10, est:false});
        } else {
          gap++;
          if (last != null && gap <= CARRY_MAX) days.push({d:ds, t:Math.round(last * 10) / 10, est:true});
          else { last = null; days.push({d:ds, t:FALLBACK_T, est:true}); }
        }
      }
    }
    var sum = 0; days.forEach(function(x){ sum += x.t; });
    return {days:days, covered:covered, total:total, mean: days.length ? sum / days.length : NaN};
  }
  // ---- 单笼积温预测：GDD 累计 + 预计羽化 + 偏差分级 ----
  function forecastCage(b, params, today){
    var out = {ok:false};
    if (!b || !params || !(params.K > 0) || !b.start || !today) return out;
    var end = b.status === 'rearing' ? today : (b.result && b.result.closeDate);
    if (!end) return out;
    var env = dailyTemps(b, end);
    var gdd = 0;
    env.days.forEach(function(x){ gdd += Math.max(0, effT(x.t, params.udt) - params.T0); });
    gdd = Math.round(gdd * 10) / 10;
    var elapsed = Math.max(0, env.days.length - 1);          // 入笼后天数
    var stageIdx = STAGE_SEQ.indexOf(b.stage);
    var actual = stageIdx >= 0 ? stageIdx / (STAGE_SEQ.length - 1) : 0;   // 阶段序进度 0–100%
    var progress = gdd / params.K;                            // 积温轨道进度 0–…
    var remain = Math.max(0, params.K - gdd);
    // 日均积温速率：优先最近 7 个实测日；无实测或入笼当天按 26℃ 假设
    var rate, rateSrc;
    var measured = env.days.filter(function(x){ return !x.est; });
    if (measured.length && elapsed >= 1){
      var recent = measured.slice(-7);
      rate = 0;
      recent.forEach(function(x){ rate += Math.max(0, effT(x.t, params.udt) - params.T0); });
      rate /= recent.length;
      rateSrc = 'env';
    } else {
      rate = Math.max(0, effT(FALLBACK_T, params.udt) - params.T0);
      rateSrc = 'assume';
    }
    var etaDate = null, etaDays = null;
    if (remain > 0 && rate > 0.1){
      etaDays = Math.ceil(remain / rate);
      etaDate = addDays(today, etaDays);
    }
    var dev = Math.round((progress - actual) * 1000) / 10;    // 偏差（百分点）
    var status;
    if (b.stage === '成虫期') status = 'done';
    else if (remain <= 0 && stageIdx >= 5) status = 'imminent';
    else if (remain <= 0 && dev > 40) status = 'ahead_severe';
    else if (remain <= 0) status = 'ahead';
    else if (dev > 40) status = 'ahead_severe';
    else if (dev > 20) status = 'ahead';
    else if (dev < -40) status = 'behind_severe';
    else if (dev < -20) status = 'behind';
    else status = 'normal';
    return {ok:true, T0:params.T0, K:params.K, udt:params.udt, ref:params.ref, note:params.note,
      days:env.days, covered:env.covered, total:env.total,
      coverage: env.total ? Math.round(env.covered / env.total * 100) : 0,
      elapsed:elapsed, gdd:gdd, remain:Math.round(remain * 10) / 10,
      progress:Math.round(progress * 1000) / 10, actual:Math.round(actual * 1000) / 10,
      dev:dev, rate:Math.round(rate * 10) / 10, rateSrc:rateSrc,
      etaDate:etaDate, etaDays:etaDays, stageIdx:stageIdx, status:status};
  }
  // ---- 本地校准：1/D 对 T̄ 最小二乘回归（n≥6 启用） ----
  function calibrateStrain(closed){
    var samples = [];
    (closed || []).forEach(function(b){
      var rec = (b.records || []).find(function(r){ return r.t === 'stage' && r.to === '成虫期'; });
      if (!rec) return;   // 未记录到成虫期 → 未成熟期历期不完整，不纳入
      var T = typeof b.avgT === 'number' ? b.avgT : dailyTemps(b, b.result && b.result.closeDate).mean;
      if (!(T >= 10 && T <= 40)) return;
      var D = daysBetween(b.start, rec.d);
      if (D < 3) return;
      samples.push({id:b.id, T:Math.round(T * 10) / 10, D:D, r:Math.round(1 / D * 10000) / 10000});
    });
    var n = samples.length;
    var out = {n:n, samples:samples, ok:false, need:6};
    if (n < 6) return out;
    var sx = 0, sy = 0, sxx = 0, sxy = 0;
    samples.forEach(function(s){ sx += s.T; sy += s.r; sxx += s.T * s.T; sxy += s.T * s.r; });
    var den = n * sxx - sx * sx;
    if (!(den > 0)) return out;
    var b1 = (n * sxy - sx * sy) / den;
    if (!(b1 > 0)){ out.note = '回归斜率非正，样本不适于线性拟合'; return out; }
    var b0 = (sy - b1 * sx) / n;
    out.ok = true;
    out.T0 = Math.round(-b0 / b1 * 100) / 100;
    out.K = Math.round(1 / b1 * 10) / 10;
    return out;
  }
  function percentile(sorted, p){
    if (!sorted.length) return NaN;
    var idx = (sorted.length - 1) * p;
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  // ---- 产量区间：同品系已结束笼累积存活率分布（n≥10 输出分位） ----
  function yieldByStrain(closed){
    var rates = [];
    (closed || []).forEach(function(b){
      if (b.result && b.result.finalCount > 0 && b.eggs > 0) rates.push(Math.round(b.result.finalCount / b.eggs * 1000) / 10);
    });
    rates.sort(function(a, b){ return a - b; });
    var out = {n:rates.length, rates:rates, ok:false};
    if (rates.length >= 10){
      out.ok = true;
      out.p10 = Math.round(percentile(rates, 0.1) * 10) / 10;
      out.p50 = Math.round(percentile(rates, 0.5) * 10) / 10;
      out.p90 = Math.round(percentile(rates, 0.9) * 10) / 10;
    }
    return out;
  }
  return {STAGE_SEQ:STAGE_SEQ, SPECIES_PARAMS:SPECIES_PARAMS, paramsFor:paramsFor,
    dailyTemps:dailyTemps, forecastCage:forecastCage, calibrateStrain:calibrateStrain,
    yieldByStrain:yieldByStrain, daysBetween:daysBetween, percentile:percentile};
})();
if (typeof MosqAlgo !== 'undefined') MosqAlgo.register('forecast', '0.1', MosqForecast);
