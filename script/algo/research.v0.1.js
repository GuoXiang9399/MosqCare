// ================= MosqResearch v0.1 科研分析套件（v3.2 迁出为独立模块，无 DOM 依赖） =================
/* ---------- 接口（纯函数） ----------
 * MosqResearch.daysBetween(d1, d2)          → 天数（d2 - d1）
 * MosqResearch.survSeries(batch)            → {eggs, events:[{day, dead, alive}], censorDay|null, closeReason}
 *   从蚊笼记录构建离散生存序列：阶段转换记录（含死亡数）为事件，结笼视为删失（未死亡个体离开观察）。
 * MosqResearch.pooledKM(batches)            → {steps:[{day, atRisk, dead, surv}], n}
 *   同组（如同品系）已结束蚊笼的池化 group 生存曲线（生命表法 / 离散 KM，结笼按删失处理）。
 * MosqResearch.logRank(kmA, kmB)            → {chi2, p}
 *   两组池化生命表的 log-rank 检验（超几何方差，df=1）。
 * MosqResearch.stageLifeTable(batches)      → {rows:[{stage, lx, dx, qx}], nEgg, nAdult, R0, T, rm, lam, dt}
 *   池化阶段生命表（l_x/d_x/100q_x）+ 表观净繁殖率与内禀增长率近似估算。
 * MosqResearch.circadian(sessions)          → {hourMean:[24], hourN:[24], overall, peakHour, lightMean, darkMean, nSessions}
 *   监测会话活跃度按一天 24 小时聚合（会话 start 为 HH:MM，样本 t 为相对秒），光相假设 06:00–20:00。
 */
var MosqResearch = (function(){
  var STAGE_SEQ = ['卵期','L1期','L2期','L3期','L4期','蛹期','成虫期'];

  function daysBetween(d1, d2){
    if (!d1 || !d2) return 0;
    var a = new Date(d1 + 'T00:00:00'), b = new Date(d2 + 'T00:00:00');
    return Math.max(0, Math.round((b - a) / 86400000));
  }
  // 标准正态分布 CDF（Abramowitz–Stegun 26.2.17 近似，误差 < 7.5e-8）
  function normCdf(x){
    var t = 1 / (1 + 0.2316419 * Math.abs(x));
    var d = 0.3989423 * Math.exp(-x * x / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x >= 0 ? 1 - p : p;
  }
  // χ² 分布（df=1）上侧概率：p = 2(1 - Φ(√χ²))
  function chi2sf1(x){
    if (x <= 0) return 1;
    return Math.min(1, Math.max(0, 2 * (1 - normCdf(Math.sqrt(x)))));
  }
  function fmtP(p){ return p < 0.001 ? '<0.001' : ('= ' + (Math.round(p * 1000) / 1000)); }

  // ---- 单笼生存序列：阶段记录为事件，结笼为删失 ----
  function survSeries(b){
    var eggs = b.eggs || 0;
    var evts = [];
    (b.records || []).forEach(function(r){
      if (r.t === 'stage' && r.dead > 0){
        evts.push({day: daysBetween(b.start, r.d), dead: r.dead});
      }
    });
    evts.sort(function(a, c){ return a.day - c.day; });
    var censorDay = null;
    if (b.result && b.result.closeDate) censorDay = daysBetween(b.start, b.result.closeDate);
    return {eggs: eggs, events: evts, censorDay: censorDay, closeReason: (b.result && b.result.reason) || ''};
  }
  // 某笼在第 d 天事件前的存活数（不含第 d 天的死亡）
  function aliveBefore(s, d){
    var n = s.eggs;
    s.events.forEach(function(e){ if (e.day < d) n -= e.dead; });
    return Math.max(0, n);
  }

  // ---- 池化 group 生存曲线（生命表法） ----
  function pooledKM(batches){
    var series = batches.map(survSeries);
    var days = {};
    series.forEach(function(s){
      s.events.forEach(function(e){ if (e.dead > 0 && e.day > 0) days[e.day] = true; });
    });
    var dayList = Object.keys(days).map(Number).sort(function(a, b){ return a - b; });
    var steps = [], S = 1, prevDay = 0;
    dayList.forEach(function(d){
      var atRisk = 0, dead = 0;
      series.forEach(function(s){
        if (s.censorDay !== null && s.censorDay < d) return;   // 结笼后不再进入风险集
        atRisk += aliveBefore(s, d);
        s.events.forEach(function(e){ if (e.day === d) dead += e.dead; });
      });
      if (!atRisk) return;
      if (dead > 0) S = S * (1 - dead / atRisk);
      steps.push({day: d, atRisk: atRisk, dead: dead, surv: Math.max(0, Math.min(1, S))});
      prevDay = d;
    });
    return {steps: steps, n: series.length, series: series};
  }

  // ---- 两组 log-rank（池化生命表，超几何方差） ----
  function logRank(kmA, kmB){
    var days = {};
    kmA.steps.forEach(function(s){ if (s.dead > 0) days[s.day] = true; });
    kmB.steps.forEach(function(s){ if (s.dead > 0) days[s.day] = true; });
    var dayList = Object.keys(days).map(Number).sort(function(a, b){ return a - b; });
    function byDay(km, d){
      for (var i = 0; i < km.steps.length; i++){ if (km.steps[i].day === d) return km.steps[i]; }
      return null;
    }
    var O_A = 0, E_A = 0, V = 0;
    dayList.forEach(function(d){
      var a = byDay(kmA, d), b = byDay(kmB, d);
      var nA = a ? a.atRisk : 0, nB = b ? b.atRisk : 0;
      var dA = a ? a.dead : 0, dB = b ? b.dead : 0;
      var N = nA + nB, D = dA + dB;
      if (!N || !D) return;
      E_A += D * nA / N;
      O_A += dA;
      if (N > 1) V += D * (nA / N) * (nB / N) * (N - D) / (N - 1);
    });
    if (V <= 0) return {chi2: NaN, p: NaN, note: 'observed=0'};
    var chi2 = (O_A - E_A) * (O_A - E_A) / V;
    return {chi2: chi2, p: chi2sf1(chi2), O: O_A, E: E_A, V: V};
  }

  // ---- 池化阶段生命表 + 表观净繁殖率 / 内禀增长率近似 ----
  function stageLifeTable(batches){
    var lx = {}, i;
    STAGE_SEQ.forEach(function(st){ lx[st] = 0; });
    lx['卵期'] = batches.reduce(function(s, b){ return s + (b.eggs || 0); }, 0);
    batches.forEach(function(b){
      (b.records || []).forEach(function(r){
        if (r.t === 'stage' && STAGE_SEQ.indexOf(r.to) >= 0 && r.to !== '卵期') lx[r.to] += r.n;
      });
    });
    var rows = [];
    for (i = 0; i < STAGE_SEQ.length; i++){
      var st = STAGE_SEQ[i], next = STAGE_SEQ[i + 1];
      var L = lx[st];
      var D = next ? Math.max(0, L - lx[next]) : 0;
      rows.push({stage: st, lx: L, dx: D, qx: L > 0 ? D / L * 100 : NaN});
    }
    var nEgg = lx['卵期'];
    var nAdult = batches.reduce(function(s, b){ return s + ((b.result && b.result.finalCount) || 0); }, 0);
    // 表观净繁殖率 R0：终末成虫合计 ÷ 起始卵合计（未计子代增殖）
    var R0 = nEgg > 0 ? nAdult / nEgg : NaN;
    // 世代均时 T：卵至成虫期转入的平均天数（以到达成虫期的蚊笼计）
    var tSum = 0, tN = 0;
    batches.forEach(function(b){
      (b.records || []).forEach(function(r){
        if (r.t === 'stage' && r.to === '成虫期'){ tSum += daysBetween(b.start, r.d); tN++; }
      });
    });
    var T = tN ? tSum / tN : NaN;
    // 近似内禀增长率 rm ≈ ln(R0)/T（精确值需每雌逐日产卵量 lx·mx 数据）
    var rm = (R0 > 0 && T > 0) ? Math.log(R0) / T : NaN;
    var lam = isFinite(rm) ? Math.exp(rm) : NaN;
    var dt = (isFinite(rm) && rm > 0) ? Math.log(2) / rm : NaN;
    return {rows: rows, nEgg: nEgg, nAdult: nAdult, R0: R0, T: T, rm: rm, lam: lam, dt: dt,
      nCages: batches.length, nReachedAdult: tN};
  }

  // ---- 昼夜节律聚合（按小时） ----
  function circadian(sessions){
    var sum = new Array(24).fill(0), cnt = new Array(24).fill(0);
    sessions.forEach(function(s){
      var parts = (s.start || '00:00').split(':');
      var startH = (parseFloat(parts[0]) || 0) + ((parseFloat(parts[1]) || 0) / 60);
      (s.samples || []).forEach(function(p){
        var h = Math.floor(startH + (p.t || 0) / 3600) % 24;
        if (h < 0) h += 24;
        sum[h] += p.ai || 0; cnt[h]++;
      });
    });
    var hourMean = sum.map(function(v, i){ return cnt[i] ? v / cnt[i] : null; });
    var nTotal = cnt.reduce(function(a, b){ return a + b; }, 0);
    var overall = nTotal ? sum.reduce(function(a, b){ return a + b; }, 0) / nTotal : 0;
    var peakHour = -1, peakV = -1;
    hourMean.forEach(function(v, h){ if (v !== null && v > peakV){ peakV = v; peakHour = h; } });
    // 光相假设：14L:10D，06:00–20:00 为光相（饲养间光周期默认 14:10）
    var lS = 0, lN = 0, dS = 0, dN = 0;
    for (var h = 0; h < 24; h++){
      if (cnt[h] === 0) continue;
      if (h >= 6 && h < 20){ lS += sum[h]; lN += cnt[h]; }
      else { dS += sum[h]; dN += cnt[h]; }
    }
    var lightMean = lN ? lS / lN : null, darkMean = dN ? dS / dN : null;
    return {hourMean: hourMean, hourN: cnt, overall: overall, peakHour: peakHour, peakV: peakV,
      lightMean: lightMean, darkMean: darkMean, nSessions: sessions.length, nSamples: nTotal};
  }

  return {
    STAGE_SEQ: STAGE_SEQ,
    daysBetween: daysBetween,
    survSeries: survSeries,
    pooledKM: pooledKM,
    logRank: logRank,
    stageLifeTable: stageLifeTable,
    circadian: circadian,
    chi2sf1: chi2sf1,
    fmtP: fmtP
  };
})();
