// ================= MosqCare v3.0 应用逻辑 =================
var strains = {}, batches = [], alerts = [], seq = 1, alertSeq = 1;
var thresholds = {tempLow:24, tempHigh:28, humLow:65, humHigh:85, co2High:1000, surv:80, feedGap:24, recGap:48};
var state = {page:'dashboard', currentBatch:null, rtab:'feed', modalBatch:null, ana:{strain:'all', range:'all'}, nbConfirmed:false};
// ================= 工具 =================
function $(s){ return document.querySelector(s); }
function val(id){ return document.getElementById(id).value; }
function getBatch(id){ return batches.find(function(b){ return b.id === id; }); }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmt1(x){ return (Math.round(x * 10) / 10).toFixed(1); }
function curCount(b){ return b.status === 'rearing' ? b.count : (b.result ? b.result.finalCount : 0); }
function survPct(b){ return curCount(b) / b.eggs * 100; }
function openAlerts(){ return alerts.filter(function(a){ return a.state === 'open'; }); }
function daysBetween(d1, d2){ return Math.round((new Date(d2) - new Date(d1)) / 86400000); }
function err(id, msg){ var e = document.getElementById(id); if (e) { e.textContent = msg; e.classList.add('show'); } }
function clearErrs(prefix){
  document.querySelectorAll('.err').forEach(function(e){ e.classList.remove('show'); e.textContent = ''; });
  document.querySelectorAll('.fw.invalid').forEach(function(e){ e.classList.remove('invalid'); });
}
var toastTimer = null;
function toast(msg){
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2400);
}
function statusBadge(b){
  if (b.status === 'rearing') return '<span class="badge bg-rear">' + tr('饲养中') + ' · ' + tr(b.stage) + '</span>';
  if (b.status === 'closed') return '<span class="badge bg-closed">' + tr('已结束') + ' · ' + tr(b.result ? b.result.reason : '') + '</span>';
  return '<span class="badge bg-disc">' + tr('已废弃') + '</span>';
}
function addAlert(type, msg, level, batchId, detail){
  var dup = alerts.some(function(a){ return a.state === 'open' && a.type === type && a.batch === batchId; });
  if (dup) return false;
  alerts.unshift({id:'A' + (alertSeq++), type:type, msg:msg, level:level, batch:batchId, detail:detail || '', at:TODAY + ' 08:00', state:'open'});
  return true;
}
// ================= 导航 =================
function navigate(page){
  state.page = page;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.toggle('active', p.id === 'page-' + page); });
  document.querySelectorAll('.ps-item[data-nav]').forEach(function(n){ n.classList.toggle('active', n.dataset.nav === page); });
  $('#pt-title').textContent = tr(PAGE_TITLES[page] || page);
  $('#proto-viewport').scrollTop = 0;
  if (page === 'dashboard') renderDashboard();
  if (page === 'strains') renderStrains();
  if (page === 'batches') renderBatches();
  if (page === 'batch-detail') renderDetail();
  if (page === 'analytics'){ renderAnalytics(); renderActAnalysis(); renderEnvAnalysis(); }
  if (page === 'alerts') renderAlerts();
  if (page === 'settings') renderSettings();
  if (page === 'alerts') renderSettings();
  if (page === 'iot'){ renderIot(); refreshLocDevices(); renderLocal(); refreshSerialPorts(); renderSerial(); }
}
function openBatch(id){ closeModal(); state.currentBatch = id; navigate('batch-detail'); }
function switchTab(name){
  document.querySelectorAll('.dtab').forEach(function(t){ t.classList.toggle('active', t.dataset.tab === name); });
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.toggle('active', p.id === 'tab-' + name); });
}
// ================= 工作台 =================
var STAGE_COLORS = {'卵期':'#94a3b8','L1期':'#93c5fd','L2期':'#60a5fa','L3期':'#38bdf8','L4期':'#0ea5e9','蛹期':'#7c3aed','成虫期':'#2563eb'};
function stageIcon(stage, size){
  var c = STAGE_COLORS[stage] || '#94a3b8';
  var s = size || 44;
  // —— 二次元部件：水润大眼 / 腮红 / 微笑 / 星光 ——
  function eye(x, y, r){
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#fff"/>' +
      '<circle cx="' + x + '" cy="' + (y + r * 0.12) + '" r="' + (r * 0.62) + '" fill="#2b3a55"/>' +
      '<circle cx="' + (x - r * 0.26) + '" cy="' + (y - r * 0.3) + '" r="' + (r * 0.26) + '" fill="#fff"/>' +
      '<circle cx="' + (x + r * 0.3) + '" cy="' + (y + r * 0.38) + '" r="' + (r * 0.15) + '" fill="#fff" opacity=".85"/>';
  }
  function blush(x, y, k){
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (3 * (k || 1)) + '" ry="' + (1.8 * (k || 1)) + '" fill="#ff9db5" opacity=".78"/>';
  }
  function smile(x, y, w){
    return '<path d="M' + (x - w) + ' ' + y + ' q' + w + ' ' + (w * 0.9) + ' ' + (w * 2) + ' 0" stroke="#2b3a55" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
  }
  function happyArc(x, y, w){
    return '<path d="M' + (x - w) + ' ' + (y + 1) + ' q' + w + ' ' + (-w * 1.5) + ' ' + (w * 2) + ' 0" stroke="#2b3a55" stroke-width="1.5" fill="none" stroke-linecap="round"/>';
  }
  function sparkle(x, y, r, o){
    return '<path d="M' + x + ' ' + (y - r) + ' L' + (x + r * 0.28) + ' ' + (y - r * 0.28) + ' L' + (x + r) + ' ' + y + ' L' + (x + r * 0.28) + ' ' + (y + r * 0.28) + ' L' + x + ' ' + (y + r) + ' L' + (x - r * 0.28) + ' ' + (y + r * 0.28) + ' L' + (x - r) + ' ' + y + ' L' + (x - r * 0.28) + ' ' + (y - r * 0.28) + ' Z" fill="#fff" opacity="' + (o || .9) + '"/>';
  }
  var open = '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '">';
  if (stage === '卵期'){
    // 两颗亮泽蚊卵，前面一颗带眯眼笑脸与腮红
    return open +
      '<ellipse cx="42.5" cy="41" rx="10" ry="13" transform="rotate(-14 42.5 41)" fill="' + c + '" opacity=".8"/>' +
      '<ellipse cx="39.5" cy="34.5" rx="2.6" ry="3.8" transform="rotate(-18 39.5 34.5)" fill="#fff" opacity=".7"/>' +
      '<ellipse cx="24.5" cy="39" rx="11" ry="14.5" transform="rotate(12 24.5 39)" fill="' + c + '"/>' +
      '<ellipse cx="20" cy="30.5" rx="3" ry="4.6" transform="rotate(16 20 30.5)" fill="#fff" opacity=".8"/>' +
      happyArc(20.9, 37.5, 2.3) + happyArc(28.9, 37.5, 2.3) +
      smile(24.9, 41.8, 2.2) +
      blush(16.6, 40.6, .9) + blush(33.2, 40.6, .9) +
      sparkle(52.5, 20, 4) + sparkle(12, 21, 2.6, .7) +
      '</svg>';
  }
  if (stage === '蛹期'){
    // 圆滚滚的蛹在打瞌睡，头顶呼吸管像小天线，飘着 Zzz
    return open +
      '<ellipse cx="33" cy="42" rx="14.5" ry="15.5" fill="' + c + '"/>' +
      '<ellipse cx="26.5" cy="38" rx="4" ry="7.5" fill="#fff" opacity=".22"/>' +
      '<circle cx="33" cy="19.5" r="10.5" fill="' + c + '"/>' +
      '<path d="M27.5 11.5 Q25.5 7 21.5 6" stroke="' + c + '" stroke-width="2.1" fill="none" stroke-linecap="round"/>' +
      '<circle cx="21" cy="5.5" r="2.5" fill="' + c + '"/>' +
      '<path d="M38.5 11.5 Q40.5 7 44.5 6" stroke="' + c + '" stroke-width="2.1" fill="none" stroke-linecap="round"/>' +
      '<circle cx="45" cy="5.5" r="2.5" fill="' + c + '"/>' +
      '<ellipse cx="29" cy="15" rx="3.4" ry="2" transform="rotate(-18 29 15)" fill="#fff" opacity=".7"/>' +
      '<path d="M27.8 19.8 q2 2.1 4 0" stroke="#2b3a55" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M35.2 19.8 q2 2.1 4 0" stroke="#2b3a55" stroke-width="1.5" fill="none" stroke-linecap="round"/>' +
      smile(32.5, 23.6, 1.9) +
      blush(25, 22.6, .95) + blush(40, 22.6, .95) +
      '<text x="47.5" y="16" font-size="8" font-style="italic" font-weight="700" fill="' + c + '" opacity=".8">z z</text>' +
      sparkle(52.5, 30, 3.2, .85) +
      '</svg>';
  }
  if (stage === '成虫期'){
    // Q 版小蚊子：大水润眼、半透明翅、细腿、头顶触角与星光
    return open +
      '<ellipse cx="47.5" cy="27" rx="14" ry="6.5" transform="rotate(-26 47.5 27)" fill="' + c + '" opacity=".38"/>' +
      '<path d="M42 30 Q50 26 57 22.5" stroke="#fff" stroke-width="1.6" opacity=".75" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="15.5" cy="25" rx="12.5" ry="6" transform="rotate(28 15.5 25)" fill="' + c + '" opacity=".38"/>' +
      '<path d="M21 27.5 Q13.5 23.5 7.5 20.5" stroke="#fff" stroke-width="1.4" opacity=".65" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="33" cy="42" rx="8.5" ry="13.5" transform="rotate(10 33 42)" fill="' + c + '"/>' +
      '<path d="M29.5 54 L26 59" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M33.5 55.5 L33.5 60.5" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M37.5 54 L41 59" stroke="' + c + '" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="30" cy="19.5" r="10" fill="' + c + '"/>' +
      '<path d="M22 24 L15 27.5" stroke="#2b3a55" stroke-width="1.8" stroke-linecap="round"/>' +
      '<path d="M34.5 10.5 Q37.5 5.5 43 4.5" stroke="' + c + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M25 10.5 Q22 6.5 17 6" stroke="' + c + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="26" cy="13" rx="3.4" ry="2.2" transform="rotate(-22 26 13)" fill="#fff" opacity=".75"/>' +
      eye(26.2, 19.5, 3.3) + eye(34.2, 19.5, 3.3) +
      smile(30.2, 24, 2.1) +
      blush(21.5, 23, .95) + blush(38.9, 23, .95) +
      sparkle(53, 15, 4) + sparkle(9.5, 17, 2.6, .7) +
      '</svg>';
  }
  // 幼虫（L1–L4）：大圆头 Q 版毛虫，触角顶小圆球，尾节渐小
  var r = {L1:9.5, L2:11, L3:12.5, L4:14}[stage] || 12;
  return open +
    '<g fill="' + c + '">' +
    '<circle cx="47" cy="43.5" r="' + (r * 0.52) + '" opacity=".8"/>' +
    '<circle cx="54.5" cy="45" r="' + (r * 0.4) + '" opacity=".62"/>' +
    '</g>' +
    '<circle cx="26" cy="40" r="' + r + '" fill="' + c + '"/>' +
    '<path d="M17 31.5 Q13.5 26 8.5 25" stroke="' + c + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="8" cy="24.5" r="2.6" fill="' + c + '"/>' +
    '<path d="M30 29.5 Q31.5 23.5 36.5 22.5" stroke="' + c + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="37" cy="22" r="2.6" fill="' + c + '"/>' +
    '<ellipse cx="' + (26 - r * 0.35) + '" cy="' + (40 - r * 0.45) + '" rx="' + (r * 0.3) + '" ry="' + (r * 0.2) + '" transform="rotate(-24 ' + (26 - r * 0.35) + ' ' + (40 - r * 0.45) + ')" fill="#fff" opacity=".6"/>' +
    eye(22.5, 40.5, r * 0.22) + eye(30.5, 40.5, r * 0.22) +
    smile(26.5, 44.6, 1.8) +
    blush(17.5, 43.6, .75) + blush(35.5, 43.6, .75) +
    sparkle(52.5, 24, 3.4, .9) +
    '</svg>';
}
function renderDashboard(){ MCStore.save();
  var rearing = batches.filter(function(b){ return b.status === 'rearing'; });
  var totalMosq = rearing.reduce(function(s, b){ return s + b.count; }, 0);
  var oa = openAlerts();
  $('#kpi-cards').innerHTML =
    '<button class="kpi" data-nav="batches"><div class="kv">' + rearing.length + '</div><div class="kl">' + tr('在养蚊笼') + '</div></button>' +
    '<button class="kpi" data-nav="batches"><div class="kv">' + totalMosq + '</div><div class="kl">' + tr('在养虫数（只）') + '</div></button>' +
    '<button class="kpi ' + (oa.length ? 'warn' : '') + '" data-nav="alerts"><div class="kv">' + oa.length + '</div><div class="kl">' + tr('待处理预警') + '</div></button>';
  // 蚊笼总览（图形化卡片，预警直接标注在卡片上）
  var larvaSize = {'L1期':30,'L2期':34,'L3期':38,'L4期':42};
  var cards = rearing.map(function(b){
    var s = strains[b.strain];
    var sc = STAGE_COLORS[b.stage] || '#64748b';
    var cageAlerts = alerts.filter(function(a){ return a.batch === b.id && a.state === 'open'; });
    var chips = cageAlerts.slice(0, 2).map(function(a){
      return '<span class="cc-alert' + (a.level === 'warn' ? '' : ' info') + '" data-nav="alerts" title="' + tr('点击进入预警中心') + '">⚠ ' + tr(a.type) + '</span>';
    }).join('');
    if (cageAlerts.length > 2) chips += '<span class="cc-alert" data-nav="alerts">+' + (cageAlerts.length - 2) + '</span>';
    return '<div class="cage-card">' +
      '<div class="cc-top"><div class="cc-ico" style="background:' + sc + '14;border-color:' + sc + '33">' + stageIcon(b.stage, larvaSize[b.stage] || 44) +
        (b.coStages || []).map(function(st){ return '<span class="cc-co" title="' + tr('并存阶段：') + tr(st) + '">' + stageIcon(st, 22) + '</span>'; }).join('') + '</div>' +
      '<div class="cc-info"><div class="cc-name"><b>' + b.id + '</b><span class="tag">' + tr(s.name) + '</span></div>' +
      '<div class="cc-stage" style="color:' + sc + '"><span class="lg-dot" style="background:' + sc + '"></span>' + tr(b.stage) +
        ((b.coStages || []).length ? ' <span style="font-weight:400;opacity:.85">+ ' + b.coStages.map(tr).join(' + ') + '</span>' : '') + '</div></div></div>' +
      T('<div class="cc-row">数量 <b>' + b.count + '</b> 只 · ' + b.start + ' 入笼</div>', '<div class="cc-row">Count <b>' + b.count + '</b> · started ' + b.start + '</div>') +
      '<div class="cc-alerts">' + chips + '</div>' +
      '<div class="cc-btns"><button class="mini-btn ghost" data-open-batch="' + b.id + '">' + tr('详情') + '</button>' +
      '<button class="mini-btn" data-open-modal="record" data-batch="' + b.id + '">' + tr('记录') + '</button></div></div>';
  }).join('');
  $('#cage-grid').innerHTML = cards || '<div class="empty" style="grid-column:1/-1">' + tr('暂无在养蚊笼，请前往「蚊笼管理」新建') + '</div>';
}
// ================= 品系档案 =================
function renderStrains(){ MCStore.save();
  var skeys = Object.keys(strains);
  $('#strain-cards').innerHTML = skeys.length ? skeys.map(function(k){
    var s = strains[k];
    var n = batches.filter(function(b){ return b.strain === k && b.status === 'rearing'; }).length;
    var gens = {};
    batches.forEach(function(b){ if (b.strain === k) gens[b.gen] = (gens[b.gen] || 0) + 1; });
    return '<div class="sub-region" data-open-strain="' + k + '" style="cursor:pointer" title="' + tr('点击查看代系关系与关联蚊笼') + '"><div style="font-weight:700;color:#0f172a">' + tr(s.name) + (s.code ? ' <span class="tag">' + tr(s.code) + '</span>' : '') + (s.abbr ? ' <span class="tag">' + tr('前缀 ') + s.abbr + '</span>' : '') + '</div>' +
      '<div style="font-size:12px;color:#64748b;margin-top:3px;font-style:italic">' + s.latin + '</div>' +
      '<div style="font-size:12.5px;color:#475569;margin-top:6px">' + tr('来源：') + (s.source || '—') + '<br>' + T('在养蚊笼 ' + n + ' 个 · 覆盖 ' + Object.keys(gens).length + ' 个世代（至 ' + s.maxGen + '）', n + ' open cage(s) · ' + Object.keys(gens).length + ' generation(s) (up to ' + s.maxGen + ')') + '</div></div>';
  }).join('') : '<div class="empty">' + tr('暂无品系：可从 CSV 导入或在「品系档案」新建。') + '</div>';
}
function openStrainModal(k, edit){
  state.currentStrain = k;
  var s = strains[k];
  var cs = batches.filter(function(b){ return b.strain === k; }).slice().sort(function(a, b){
    return a.gen === b.gen ? (a.id < b.id ? 1 : -1) : (parseInt(a.gen.slice(1), 10) - parseInt(b.gen.slice(1), 10));
  });
  // 代系树：parent 缺失或不在本品系集合中的蚊笼为根（经典自上而下树状）
  var ids = {};
  cs.forEach(function(b){ ids[b.id] = true; });
  var kids = {};
  var roots = [];
  cs.forEach(function(b){
    if (b.parent && ids[b.parent]) (kids[b.parent] = kids[b.parent] || []).push(b);
    else roots.push(b);
  });
  function treeLi(b){
    var st = b.status === 'rearing' ? tr(b.stage) : (b.result ? tr(b.result.reason) : tr('已结束'));
    var cls = b.status === 'rearing' ? ' now' : '';
    return '<li><div class="tree-box' + cls + '" data-open-batch="' + b.id + '" title="' + tr('点击查看蚊笼详情') + '"><b>' + b.id + '</b> · ' + b.gen +
      '<br>' + st + T(' · ' + curCount(b) + ' 只 · 存活 ' + fmt1(survPct(b)) + '%', ' · ' + curCount(b) + ' · survival ' + fmt1(survPct(b)) + '%') + (b.status === 'rearing' ? ' <span style="color:#1d4ed8">' + tr('· 在养') + '</span>' : '') + '</div>' +
      (kids[b.id] ? '<ul>' + kids[b.id].map(treeLi).join('') + '</ul>' : '') + '</li>';
  }
  var tree = roots.length ? '<div class="strain-tree"><div class="stree"><ul>' + roots.map(treeLi).join('') + '</ul></div></div>' : '<div class="empty">' + tr('暂无蚊笼记录') + '</div>';
  var rows = cs.map(function(b){
    var st = b.status === 'rearing' ? T(tr(b.stage) + ' · ' + b.count + ' 只', tr(b.stage) + ' · ' + b.count) : (b.result ? tr(b.result.reason) : tr('已结束'));
    return '<tr><td><b>' + b.id + '</b></td><td>' + b.gen + '</td><td>' + st + '</td><td class="surv">' + fmt1(survPct(b)) + '%</td><td><button class="mini-btn ghost" data-open-batch="' + b.id + '">' + tr('详情') + '</button></td></tr>';
  }).join('');
  var info;
  if (edit){
    info = '<div style="display:grid;grid-template-columns:88px 1fr;gap:8px 10px;align-items:center;font-size:12.5px">' +
      '<span style="color:#64748b">' + tr('名称') + '</span><input id="es-name" value="' + esc(s.name) + '" style="font-size:12.5px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px">' +
      '<span style="color:#64748b">' + tr('蚊株') + '</span><input id="es-code" value="' + esc(s.code) + '" style="font-size:12.5px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px">' +
      '<span style="color:#64748b">' + tr('蚊株缩写') + '</span><input id="es-abbr" value="' + esc(s.abbr || '') + '" placeholder="' + tr('如 FS，用作该株蚊笼笼号前缀') + '" style="font-size:12.5px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px">' +
      '<span style="color:#64748b">' + tr('物种（拉丁名）') + '</span><input id="es-latin" value="' + esc(s.latin) + '" style="font-size:12.5px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px;font-style:italic">' +
      '<span style="color:#64748b">' + tr('来源') + '</span><input id="es-source" value="' + esc(s.source) + '" style="font-size:12.5px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px">' +
      '<span style="color:#64748b">' + tr('备注') + '</span><input id="es-note" value="' + esc(s.note || '') + '" style="font-size:12.5px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:6px">' +
      '</div><div style="display:flex;gap:8px;margin-top:10px"><button class="mini-btn" onclick="saveStrain()">' + tr('保存') + '</button><button class="mini-btn ghost" onclick="openStrainModal(state.currentStrain)">' + tr('取消') + '</button></div>';
  } else {
    info = '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><div style="font-weight:700;color:#0f172a;font-size:14px">' + tr(s.name) + ' <span class="tag">' + tr(s.code) + '</span>' + (s.abbr ? ' <span class="tag">' + tr('缩写 ') + s.abbr + '</span>' : '') + '</div>' +
      '<button class="mini-btn ghost" style="margin-left:auto" onclick="openStrainModal(state.currentStrain, true)">' + tr('编辑信息') + '</button></div>' +
      '<div style="font-size:12px;color:#64748b;margin-top:2px;font-style:italic">' + s.latin + '</div>' +
      '<div style="font-size:12.5px;color:#475569;margin-top:4px">' + tr('来源：') + s.source + (s.note ? ' · ' + s.note : '') + '</div>';
  }
  $('#strain-detail').innerHTML = info +
    '<div class="region-title" style="font-size:12.5px;margin:12px 0 4px">' + tr('代系关系（树状，点击节点查看蚊笼详情）') + '</div>' +
    '<div style="margin:4px 0 8px">' + tree + '</div>' +
    '<div class="region-title" style="font-size:12.5px;margin:12px 0 4px">' + T('关联蚊笼（' + cs.length + '）', 'Linked cages (' + cs.length + ')') + '</div>' +
    '<div class="tbl-wrap" style="max-height:220px;overflow:auto"><table class="tbl"><thead><tr><th>' + tr('笼号') + '</th><th>' + tr('世代') + '</th><th>' + tr('状态') + '</th><th>' + tr('存活率') + '</th><th>' + tr('操作') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  showModal('modal-strain');
}
function saveStrain(){
  var k = state.currentStrain, s = strains[k];
  var name = document.getElementById('es-name').value.trim();
  if (!name){ toast(tr('蚊株名称不能为空')); return; }
  s.name = name;
  s.code = document.getElementById('es-code').value.trim() || s.code;
  s.abbr = document.getElementById('es-abbr').value.trim().toUpperCase();
  s.latin = document.getElementById('es-latin').value.trim() || s.latin;
  s.source = document.getElementById('es-source').value.trim();
  s.note = document.getElementById('es-note').value.trim();
  renderStrains();
  toast(tr('品系信息已保存'));
  openStrainModal(k);
}
// ================= 蚊笼管理 =================
function renderBatches(){ MCStore.save();
  var fs = $('#flt-status').value, fr = $('#flt-strain').value;
  var rows = batches.filter(function(b){ return (fs === 'all' || b.status === fs) && (fr === 'all' || b.strain === fr); });
  if (!rows.length){
    $('#batch-tbody').innerHTML = '<tr><td colspan="8"><div class="empty">' + tr('当前筛选条件下暂无蚊笼，可调整筛选或新建蚊笼') + '</div></td></tr>';
    return;
  }
  $('#batch-tbody').innerHTML = rows.map(function(b){
    var s = strains[b.strain];
    return '<tr><td><b>' + b.id + '</b></td><td>' + tr(s.name) + ' / ' + b.gen + '</td><td>' + b.start + '</td><td>' + tr(b.status === 'rearing' ? b.stage : (b.result ? b.result.stage : b.stage)) + '</td><td>' + curCount(b) + '</td><td class="surv">' + fmt1(survPct(b)) + '%</td><td>' + statusBadge(b) + '</td>' +
      '<td><button class="mini-btn ghost" data-open-batch="' + b.id + '">' + tr('详情') + '</button> <button class="mini-btn" data-open-modal="record" data-batch="' + b.id + '"' + (b.status !== 'rearing' ? ' disabled' : '') + '>' + tr('记录') + '</button> <button class="mini-btn ghost" data-open-report="' + b.id + '">' + tr('报告') + '</button></td></tr>';
  }).join('');
}
// ================= 蚊笼详情 =================
function stageSegs(b){
  var segs = [];
  b.records.forEach(function(r){ if (r.t === 'stage') segs.push({stage:r.to, d:r.d, n:r.n}); });
  if (b.status !== 'rearing' && b.result){
    if (segs.length){ var last = segs[segs.length - 1]; last.n = b.result.finalCount; last.d = b.result.closeDate; last.final = true; }
    else segs.push({stage:b.result.stage, d:b.result.closeDate, n:b.result.finalCount, final:true});
  }
  return segs;
}
function findStageRec(b, to){ return b.records.find(function(r){ return r.t === 'stage' && r.to === to; }); }
function renderStepper(b){
  var segs = stageSegs(b);
  var html = '';
  segs.forEach(function(s, i){
    var cls = (i === segs.length - 1) ? (b.status === 'rearing' ? 'now' : 'done') : 'done';
    var last = i === segs.length - 1;
    var sub = s.d.slice(5);
    if (i === 0) sub += T(' · 起始 ' + b.eggs + ' 粒', ' · ' + b.eggs + ' eggs at start');
    else if (segs[i - 1].n) sub += T(' · 阶段存活率 ', ' · stage survival ') + fmt1(s.n / segs[i - 1].n * 100) + '%';
    if (last){
      sub += b.status === 'rearing' ? T(' · 进行中', ' · ongoing') : T(' · 结束', ' · closed');
      if (b.eggs) sub += T(' · 累积存活率 ', ' · cum. survival ') + fmt1(survPct(b)) + '%';
    }
    var n = last ? curCount(b) : s.n;
    html += '<div class="step ' + cls + '"><div class="sn">' + tr(s.stage) + '</div><div class="sc">' + n + '</div><div class="sd">' + sub + '</div></div>';
    if (i < segs.length - 1) html += '<div class="step-sep">→</div>';
  });
  var lastIdx = STAGES.indexOf(segs[segs.length - 1] ? segs[segs.length - 1].stage : b.stage);
  for (var i = lastIdx + 1; i < STAGES.length; i++){
    html += '<div class="step-sep">→</div><div class="step"><div class="sn">' + tr(STAGES[i]) + '</div><div class="sc">—</div><div class="sd">' + tr('未记录') + '</div></div>';
  }
  $('#bd-stepper').innerHTML = html;
}
function tlItem(b, r, idx){
  var d = r.tm ? r.d + ' ' + r.tm : r.d;
  var cls = '', ico = '', title = '', sub = '', badges = '';
  if (r.t === 'stage'){
    cls = 'i-stage'; ico = tr('计');
    var name = r.from === '—' ? tr('卵入笼') : tr(r.from) + ' → ' + tr(r.to);
    title = T('阶段计数 · ' + name, 'Stage count · ' + name);
    badges = '<span class="delta">+' + r.n + '</span>' + (r.dead ? '<span class="delta neg">' + tr('淘汰 ') + r.dead + '</span>' : '') + '<span class="delta gray">' + tr(r.method) + '</span>';
    sub = r.note || '';
  } else if (r.t === 'env'){
    cls = 'i-env'; ico = tr('环'); title = tr('环境记录');
    sub = T('温度 ' + r.temp + '℃ · 相对湿度 ' + r.hum + '% · 光周期 ' + (r.photo || '14:10'), 'Temp ' + r.temp + '℃ · RH ' + r.hum + '% · L:D ' + (r.photo || '14:10')) + (r.note ? ' · ' + r.note : '');
  } else if (r.t === 'feed'){
    cls = 'i-feed'; ico = tr('饲'); title = T('饲喂 · ' + tr(r.type), 'Feed · ' + tr(r.type));
    sub = (r.spec || '') + (r.way ? ' · ' + tr(r.way) : '') + (r.note ? ' · ' + r.note : '');
  } else if (r.t === 'treat'){
    cls = 'i-treat'; ico = tr('处'); title = T('实验处理 · ' + tr(r.type), 'Experiment · ' + tr(r.type));
    sub = (r.out > 0 ? T('移出 ' + r.out + ' 只 · ', 'Removed ' + r.out + ' · ') : '') + (r.to ? T('去向：', 'To: ') + r.to : '') + (r.by ? T(' · 操作人：' + r.by, ' · by ' + r.by) : '') + (r.note ? ' · ' + r.note : '');
  } else if (r.t === 'close'){
    cls = 'i-close'; ico = tr('结'); title = T('蚊笼结束 · ' + tr(r.reason), 'Cage closed · ' + tr(r.reason));
    sub = T('终末数量 ' + r.n, 'Final count ' + r.n) + (b.result && b.result.note ? ' · ' + b.result.note : '');
  }
  return '<div class="tl-item"><div class="tl-date">' + d + '</div><div class="tl-ico ' + cls + '">' + ico + '</div>' +
    '<div class="tl-body"><div class="tl-t">' + title + ' ' + badges + '</div>' + (sub ? '<div class="tl-s">' + sub + '</div>' : '') + '</div></div>';
}
function renderDetail(){ MCStore.save();
  var b = getBatch(state.currentBatch) || batches[0];
  if (!b){
    $('#bd-header').innerHTML = '<div class="empty">' + tr('暂无蚊笼：请先在「品系档案」导入或新建品系，再于「蚊笼管理」新建蚊笼。') + '</div>';
    $('#bd-stepper').innerHTML = '';
    $('#bd-forecast').innerHTML = '';
    $('#bd-timeline').innerHTML = '';
    return;
  }
  state.currentBatch = b.id;
  var s = strains[b.strain];
  var banner = $('#bd-readonly');
  if (b.status !== 'rearing'){
    banner.style.display = 'block';
    banner.textContent = T('该蚊笼已于 ' + b.result.closeDate + ' 结束（' + tr(b.result.reason) + '），现为只读视图，不可新增记录。', 'This cage was closed on ' + b.result.closeDate + ' (' + tr(b.result.reason) + ') and is read-only; no new records.');
  } else banner.style.display = 'none';
  var head = '<div class="bd-head"><div><div style="font-size:16px;font-weight:700;color:#0f172a">' + b.id + ' · ' + tr(s.name) + ' ' + b.gen + '</div></div>' +
    '<div class="bd-actions" style="margin:0">' + (b.status === 'rearing' ?
      '<button class="mini-btn" data-open-modal="record">' + tr('＋ 新增记录') + '</button>' +
      '<button class="mini-btn ghost" data-open-modal="close">' + tr('结束蚊笼') + '</button>' +
      '<span class="ba-sep"></span>' +
      '<button class="mini-btn ghost" onclick="openCageEdit()">' + tr('编辑') + '</button>' +
      '<button class="mini-btn danger" id="btn-cage-del" onclick="deleteCage()">' + tr('删除') + '</button>'
      : '') + '</div></div>';
  $('#bd-header').innerHTML = head;
  renderStepper(b);
  renderForecastCard(b);
  var items = [];
  for (var j = b.records.length - 1; j >= 0; j--) items.push(tlItem(b, b.records[j], j));
  $('#bd-timeline').innerHTML = items.join('');
}
// ================= 模态框 =================
function showModal(id){
  $('#modal-layer').classList.add('open');
  document.querySelectorAll('.modal').forEach(function(m){ m.classList.toggle('active', m.id === id); });
}
function closeModal(){
  $('#modal-layer').classList.remove('open');
  document.querySelectorAll('.modal').forEach(function(m){ m.classList.remove('active'); });
}
function setRTab(tab){
  state.rtab = tab;
  document.querySelectorAll('.m-tab').forEach(function(t){ t.classList.toggle('active', t.dataset.rtab === tab); });
  document.querySelectorAll('.rform').forEach(function(f){ f.classList.toggle('active', f.id === 'form-' + tab); });
}
function openRecordModal(bId, tab){
  var b = getBatch(bId);
  if (!b || b.status !== 'rearing'){ toast(tr('该蚊笼不在饲养中，记录入口已关闭')); return; }
  state.modalBatch = bId;
  $('#mr-batch').textContent = bId;
  var next = STAGES[STAGES.indexOf(b.stage) + 1];
  $('#f-stage-to').innerHTML = next ? '<option value="' + next + '">' + tr(next) + '</option>' : '';
  $('#stage-hint').textContent = next ?
    T('当前阶段 ' + tr(b.stage) + ' · 当前数量 ' + curCount(b) + '（转入 + 淘汰不得超过当前数量）', 'Current stage ' + tr(b.stage) + ' · count ' + curCount(b) + ' (transferred in + culled must not exceed the current count)') :
    T('当前已是成虫期，无下一阶段；请使用饲喂 / 环境 / 实验处理记录。', 'Already at the adult stage — no next stage; use feeding / environment / experiment records.');
  $('#f-stage-n').value = ''; $('#f-stage-dead').value = '0'; $('#f-stage-note').value = '';
  clearErrs(); setRTab(tab || 'feed'); showModal('modal-record');
}
function openNewBatchModal(){
  state.nbConfirmed = false;
  $('#nb-warn').style.display = 'none';
  var skeys = Object.keys(strains);
  if (!skeys.length){ toast(tr('请先在「品系档案」新增或导入品系')); return; }
  $('#f-nb-strain').innerHTML = skeys.map(function(k){
    var s = strains[k];
    return '<option value="' + k + '">' + tr(s.name) + (s.code ? T('（' + tr(s.code) + '）', ' (' + tr(s.code) + ')') : '') + '</option>';
  }).join('');
  var rearing = batches.filter(function(b){ return b.status === 'rearing'; });
  var pSel = $('#f-nb-parent');
  pSel.innerHTML = '<option value="">' + tr('— 无 —') + '</option>' + rearing.map(function(b){
    return '<option value="' + b.id + '">' + b.id + ' · ' + b.gen + T('（' + tr(strains[b.strain].name) + '）', ' (' + tr(strains[b.strain].name) + ')') + '</option>';
  }).join('');
  pSel.onchange = function(){
    var p = getBatch(pSel.value);
    if (p){
      var m = /^F(\d+)$/.exec(p.gen);
      if (m) $('#f-nb-gen').value = 'F' + (+m[1] + 1);
      if (!$('#f-nb-note').value) $('#f-nb-note').value = '亲代蚊笼 ' + p.id + ' 产卵收集';
    }
  };
  $('#f-nb-eggs').value = ''; $('#f-nb-note').value = ''; $('#f-nb-gen').value = 'F1';
  $('#f-nb-start').value = TODAY;
  clearErrs(); showModal('modal-new-batch');
}
function submitNewStrain(e){
  e.preventDefault(); clearErrs();
  var name = val('f-ns-name').trim();
  if (!name){ err('e-ns-name', tr('请填写名称')); return false; }
  var n = 1; while (strains['S' + n]) n++;
  strains['S' + n] = {code: val('f-ns-code').trim(), abbr: val('f-ns-abbr').trim().toUpperCase(), name: name, latin: val('f-ns-latin').trim(), source: val('f-ns-source').trim(), maxGen: 'F1', note: val('f-ns-note').trim()};
  closeModal(); renderAll();
  toast(T('品系「' + name + '」已新增', 'Strain "' + name + '" added'));
  return false;
}
function openCloseModal(){
  var b = getBatch(state.currentBatch);
  if (!b || b.status !== 'rearing'){ toast(tr('仅饲养中的蚊笼可以结束')); return; }
  state.modalBatch = b.id;
  $('#mc-batch').textContent = b.id;
  $('#f-cb-stage').innerHTML = STAGES.map(function(x){ return '<option value="' + x + '"' + (x === b.stage ? ' selected' : '') + '>' + tr(x) + '</option>'; }).join('');
  $('#f-cb-count').value = curCount(b);
  $('#f-cb-date').value = TODAY; $('#f-cb-note').value = ''; $('#f-cb-check').checked = false;
  hideCbConfirm(); clearErrs(); showModal('modal-close');
}
// ================= 表单提交 =================
function submitStage(e){
  e.preventDefault(); clearErrs();
  var b = getBatch(state.modalBatch); if (!b) return false;
  var d = val('f-stage-date'), to = val('f-stage-to'), n = +val('f-stage-n'), dead = +(val('f-stage-dead') || 0);
  var ok = true;
  if (!d || d < b.start || d > TODAY){ err('e-stage-date', T('日期需在 ' + b.start + ' 至 ' + TODAY + ' 之间', 'Date must be between ' + b.start + ' and ' + TODAY)); ok = false; }
  if (!to || STAGES.indexOf(to) !== STAGES.indexOf(b.stage) + 1){ err('e-stage-to', T('转入阶段必须为当前阶段（' + tr(b.stage) + '）的下一阶段', 'Next stage must follow the current stage (' + tr(b.stage) + ')')); ok = false; }
  if (!(n >= 1)){ err('e-stage-n', tr('转入数量需 ≥ 1')); ok = false; }
  if (dead < 0){ err('e-stage-dead', tr('不能为负数')); ok = false; }
  if (ok && n + dead > curCount(b)){ err('e-stage-n', T('转入 ' + n + ' + 淘汰 ' + dead + ' 超过当前数量 ' + curCount(b), 'Transferred ' + n + ' + culled ' + dead + ' exceeds the current count ' + curCount(b))); ok = false; }
  if (!ok) return false;
  b.records.push({d:d, t:'stage', from:b.stage, to:to, n:n, dead:dead, method:val('f-stage-method'), after:{stage:to, count:n}, note:val('f-stage-note') || undefined});
  b.stage = to; b.count = n;
  var alerted = false;
  if (survPct(b) < thresholds.surv){
    alerted = addAlert('存活率偏低', T('累积存活率 ' + fmt1(survPct(b)) + '%，低于阈值 ' + thresholds.surv + '%', 'Cumulative survival ' + fmt1(survPct(b)) + '% below threshold ' + thresholds.surv + '%'), 'warn', b.id, T('触发 ' + fmt1(survPct(b)) + '% / 阈值 ≥' + thresholds.surv + '%', 'Triggered ' + fmt1(survPct(b)) + '% / threshold ≥' + thresholds.surv + '%'));
  }
  closeModal(); renderAll(); toast(T('记录已保存' + (alerted ? '，并触发存活率预警' : ''), 'Record saved' + (alerted ? '; survival alert raised' : '')));
  return false;
}
function submitFeed(e){
  e.preventDefault(); clearErrs();
  var b = getBatch(state.modalBatch); if (!b) return false;
  var d = val('f-feed-d'), spec = val('f-feed-spec').trim();
  var ok = true;
  if (!d || d > TODAY){ err('e-feed-d', tr('日期不得晚于今天')); ok = false; }
  if (!spec){ err('e-feed-spec', tr('请填写规格')); ok = false; }
  if (!ok) return false;
  var tm = val('f-feed-tm') || '08:00';
  b.records.push({d:d, tm:tm, t:'feed', type:val('f-feed-type'), spec:spec, way:val('f-feed-way'), note:val('f-feed-note') || undefined});
  b.lastFeed = d + ' ' + tm;
  closeModal(); renderAll(); toast(tr('饲喂记录已保存'));
  return false;
}
function submitEnv(e){
  e.preventDefault(); clearErrs();
  var b = getBatch(state.modalBatch); if (!b) return false;
  var d = val('f-env-d'), temp = parseFloat(val('f-env-temp')), hum = parseFloat(val('f-env-hum'));
  var ok = true;
  if (!d || d > TODAY){ err('e-env-d', tr('日期不得晚于今天')); ok = false; }
  if (!(temp >= 10 && temp <= 40)){ err('e-env-temp', tr('温度需在 10–40℃ 之间')); ok = false; }
  if (!(hum >= 20 && hum <= 100)){ err('e-env-hum', tr('湿度需在 20–100% 之间')); ok = false; }
  if (!ok) return false;
  var tm = val('f-env-tm') || '08:00';
  b.records.push({d:d, tm:tm, t:'env', temp:temp, hum:hum, photo:val('f-env-photo'), note:val('f-env-note') || undefined});
  var alerted = false;
  if (temp > thresholds.tempHigh || temp < thresholds.tempLow){
    alerted = addAlert('环境超标', T('温度 ' + temp + '℃ 超出阈值 ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃', 'Temperature ' + temp + '℃ outside threshold ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃'), 'warn', b.id, T('触发 ' + temp + '℃ / 阈值 ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃（环境记录保存时）', 'Triggered ' + temp + '℃ / threshold ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃ (on env. record save)'));
  }
  if (hum > thresholds.humHigh || hum < thresholds.humLow){
    alerted = addAlert('环境超标', T('湿度 ' + hum + '% 超出阈值 ' + thresholds.humLow + '–' + thresholds.humHigh + '%', 'Humidity ' + hum + '% outside threshold ' + thresholds.humLow + '–' + thresholds.humHigh + '%'), 'warn', b.id, T('触发 ' + hum + '% / 阈值 ' + thresholds.humLow + '–' + thresholds.humHigh + '%（环境记录保存时）', 'Triggered ' + hum + '% / threshold ' + thresholds.humLow + '–' + thresholds.humHigh + '% (on env. record save)'));
  }
  closeModal(); renderAll(); toast(T('环境记录已保存' + (alerted ? '，并触发环境预警' : ''), 'Env. record saved' + (alerted ? '; environment alert raised' : '')));
  return false;
}
function submitTreat(e){
  e.preventDefault(); clearErrs();
  var b = getBatch(state.modalBatch); if (!b) return false;
  var out = +(val('f-treat-out') || 0);
  if (out < 0){ err('e-treat-out', tr('移出数量不能为负')); return false; }
  if (out > curCount(b)){ err('e-treat-out', T('移出数量不得超过当前数量 ' + curCount(b), 'Removed count must not exceed the current count ' + curCount(b))); return false; }
  b.records.push({d:TODAY, t:'treat', type:val('f-treat-type'), out:out, to:val('f-treat-to'), by:val('f-treat-by'), note:val('f-treat-note') || undefined});
  if (out > 0) b.count -= out;
  closeModal(); renderAll();
  toast(T('实验处理记录已保存' + (val('f-treat-type') === '分装扩繁' ? '；分装扩繁请另建子笼并备注关联' : ''), 'Experiment record saved' + (val('f-treat-type') === '分装扩繁' ? '; create a sub-cage and link it in notes' : '')));
  return false;
}
function submitNewBatch(e){
  e.preventDefault(); clearErrs();
  var strain = val('f-nb-strain'), parent = val('f-nb-parent'), gen = val('f-nb-gen').trim().toUpperCase(), start = val('f-nb-start'), eggs = +val('f-nb-eggs'), note = val('f-nb-note');
  if (parent && !getBatch(parent)) parent = '';
  var ok = true;
  if (!/^F\d+$/.test(gen)){ err('e-nb-gen', T('世代号格式为 F + 数字，如 F13', 'Generation must be F + digits, e.g. F13')); ok = false; }
  if (!start || start > TODAY){ err('e-nb-start', tr('日期不得晚于今天')); ok = false; }
  if (!(eggs >= 1)){ err('e-nb-eggs', tr('起始卵量需 ≥ 1')); ok = false; }
  if (!ok) return false;
  var dup = batches.some(function(x){ return x.strain === strain && x.gen === gen && x.status === 'rearing'; });
  if (dup && !state.nbConfirmed){
    state.nbConfirmed = true;
    var w = $('#nb-warn'); w.style.display = 'block';
    w.textContent = T('该品系已存在 ' + gen + ' 世代在养蚊笼。若为同代分笼扩繁，请再次点击「创建蚊笼」确认；否则请核对世代号。', 'An open ' + gen + ' cage already exists for this strain. If this is a sub-split of the same generation, click "Create Cage" again to confirm; otherwise check the generation number.');
    return false;
  }
  var pre = (strains[strain] && strains[strain].abbr) ? strains[strain].abbr.toUpperCase() : 'C';
  var seq2 = 1;
  while (getBatch(pre + '-' + String(seq2).padStart(2, '0'))) seq2++;
  var id = pre + '-' + String(seq2).padStart(2, '0');
  batches.unshift({id:id, strain:strain, gen:gen, parent:parent || undefined, start:start, eggs:eggs, stage:'卵期', count:eggs, status:'rearing', lastFeed:null,
    records:[{d:start, t:'stage', from:'—', to:'卵期', n:eggs, dead:0, method:'全数', after:{stage:'卵期', count:eggs}, note:note || undefined}]});
  closeModal(); renderAll(); openBatch(id);
  toast(T('蚊笼 ' + id + ' 已创建，已生成「卵入笼」记录', 'Cage ' + id + ' created with an "eggs in cage" record'));
  return false;
}
function submitCloseAsk(e){
  e.preventDefault(); clearErrs();
  var cnt = +val('f-cb-count'); var ok = true;
  if (!(cnt >= 0)){ err('e-cb-count', tr('终末数量需 ≥ 0')); ok = false; }
  if (!val('f-cb-date')){ err('e-cb-check', tr('请选择结束日期')); ok = false; }
  if (!$('#f-cb-check').checked){ err('e-cb-check', tr('请先勾选「我已复核终末数量与阶段」')); ok = false; }
  if (!ok) return false;
  $('#cb-confirm').classList.add('show');
  return false;
}
function hideCbConfirm(){ $('#cb-confirm').classList.remove('show'); }
function submitCloseDo(){
  var b = getBatch(state.modalBatch); if (!b) return;
  var reason = val('f-cb-reason');
  b.result = {closeDate:val('f-cb-date') || TODAY, stage:val('f-cb-stage'), finalCount:+val('f-cb-count'), reason:reason, note:val('f-cb-note') || ''};
  b.status = reason === '全量废弃' ? 'discarded' : 'closed';
  b.records.push({d:b.result.closeDate, t:'close', reason:reason, n:b.result.finalCount});
  alerts.forEach(function(a){ if (a.batch === b.id && a.state === 'open') a.state = 'auto'; });
  hideCbConfirm(); closeModal(); renderAll();
  toast(tr('蚊笼已结束，已进入产能统计'));
}
// ================= 预警中心 =================
var ALERT_TIPS = {
  '环境超标': '调整空调 / 加湿除湿设备；如已接入 IoT 恒温加热垫或循环风扇，可远程开启辅助调节（见「IoT 接入」）。',
  '存活率偏低': '检查饲料与水质，排查饲养密度与温度；异常个体单独隔离观察。',
  '饲喂超时': '尽快补喂，并核对饲喂计划与记录习惯。',
  '记录断档': '补记当日观察结果，避免台账断档影响统计口径。',
  '串口监测CO₂': 'CO₂ 偏高：优先通风换气（开窗 / 机械通风），核对饲养密度与人员进出；长期偏高建议接入 CO₂ 变送器联动通风。',
  '发育预测': '预计随时羽化：提前准备羽化笼、糖水与实验排期；羽化后转入成虫笼并记录阶段。',
  '发育偏差': '积温轨道与实际阶段推进不符：优先核对环境温度与水温（水温才是幼虫实际经历的温度），再排查密度、饲料与水质；积累已结束蚊笼后在「统计分析 → 科研分析」本地校准 T₀/K。'
};
function renderAlerts(){ MCStore.save();
  var stMap = {};
  alerts.forEach(function(a){
    var m = stMap[a.type] = stMap[a.type] || {open:0, done:0};
    if (a.state === 'open') m.open++; else m.done++;
  });
  var html = '';
  if (Object.keys(stMap).length){
    html += '<div class="region-title" style="font-size:12.5px">' + tr('预警统计（累计触发）') + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
    Object.keys(stMap).forEach(function(k){
      html += '<span class="mchip">' + tr(k) + T(' · 触发 <b>' + (stMap[k].open + stMap[k].done) + '</b> 次', ' · <b>' + (stMap[k].open + stMap[k].done) + '</b> triggers') + '</span>';
    });
    html += '</div>';
  }
  html += '<div class="region-title" style="font-size:12.5px">' + T('预警列表（待处理 ' + openAlerts().length + ' 条）', 'Alerts (' + openAlerts().length + ' open)') + '</div>';
  if (!alerts.length){ html += '<div class="empty">' + tr('暂无预警记录') + '</div>'; $('#alert-list').innerHTML = html; return; }
  alerts.forEach(function(a){
    var stateBadge = a.state === 'open' ? '<span class="badge state-open">' + tr('待处理') + '</span>' :
      (a.state === 'done' ? '<span class="badge state-done">' + tr('已提醒') + '</span>' : '<span class="badge state-auto">' + tr('已关闭（蚊笼结束）') + '</span>');
    var body = '';
    if (a.state === 'open'){
      body = '<div class="alert-meta" style="margin-top:8px"><b>' + tr('处理建议：') + '</b>' + tr(ALERT_TIPS[a.type] || '按本室饲养规程处理，必要时结合 IoT 设备辅助调节。') + '</div>';
    }
    html += '<div class="alert-card ' + a.level + '"><div class="alert-head"><span class="lvl ' + (a.level === 'warn' ? 'lvl-warn' : (a.level === 'info' ? 'lvl-info' : 'lvl-crit')) + '">' + (a.level === 'warn' ? tr('警告') : tr('提示')) + '</span><b>' + tr(a.type) + '</b>' +
      '<a href="#" data-open-batch="' + a.batch + '" onclick="return false" style="color:#1d4ed8;font-weight:600">' + a.batch + '</a>' + stateBadge +
      '<span class="alert-meta" style="margin-left:auto">' + a.at + '</span></div>' +
      '<div class="alert-msg">' + a.msg + '</div><div class="alert-meta">' + a.detail + '</div>' + body + '</div>';
  });
  $('#alert-list').innerHTML = html;
}
function saveThresholds(){
  var t = {tempLow:+val('th-temp-low'), tempHigh:+val('th-temp-high'), humLow:+val('th-hum-low'), humHigh:+val('th-hum-high'), co2High:+val('th-co2-high') || 1000, surv:+val('th-surv'), feedGap:+val('th-feed-gap'), recGap:+val('th-rec-gap')};
  if (t.tempLow >= t.tempHigh){ toast(tr('保存失败：温度下限须小于上限')); return; }
  if (t.humLow >= t.humHigh){ toast(tr('保存失败：湿度下限须小于上限')); return; }
  if (!(t.surv > 0 && t.surv <= 100)){ toast(tr('保存失败：存活率阈值需在 0–100 之间')); return; }
  if (!(t.feedGap > 0 && t.recGap > 0)){ toast(tr('保存失败：间隔阈值需大于 0')); return; }
  thresholds = t;
  toast(tr('阈值已保存，仅影响此后检测'));
}
// ================= IoT 接入 =================
var iotSensors = [];
var iotCams = [];
var iotPlugs = [];
function icoSvg(kind, color){
  var c = color || '#64748b';
  if (kind === 'sensor') return '<svg viewBox="0 0 64 64" width="30" height="30"><rect x="26" y="8" width="12" height="30" rx="6" fill="none" stroke="' + c + '" stroke-width="4"/><circle cx="32" cy="47" r="9" fill="' + c + '"/><rect x="29" y="32" width="6" height="17" rx="3" fill="' + c + '"/></svg>';
  if (kind === 'cam') return '<svg viewBox="0 0 64 64" width="30" height="30"><rect x="6" y="18" width="34" height="28" rx="6" fill="none" stroke="' + c + '" stroke-width="4"/><path d="M40 28 L56 20 V44 L40 36 Z" fill="none" stroke="' + c + '" stroke-width="4" stroke-linejoin="round"/><circle cx="23" cy="32" r="7" fill="none" stroke="' + c + '" stroke-width="3"/></svg>';
  return '<svg viewBox="0 0 64 64" width="30" height="30"><rect x="10" y="10" width="44" height="44" rx="12" fill="none" stroke="' + c + '" stroke-width="4"/><circle cx="24" cy="30" r="3.5" fill="' + c + '"/><circle cx="40" cy="30" r="3.5" fill="' + c + '"/><path d="M26 43 q6 4 12 0" stroke="' + c + '" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
}
function iotEmpty(txt){ return '<div class="empty" style="grid-column:1/-1">' + txt + '</div>'; }
function renderIot(){
  serLoadDevs(); renderSerDevs(); initThrPreset();
  $('#iot-sensors').innerHTML = iotSensors.length ? iotSensors.map(function(s){
    var b = s.cage ? getBatch(s.cage) : null;
    return '<div class="cage-card"><div class="cc-top"><div class="cc-ico" style="width:46px;height:46px">' + icoSvg('sensor') + '</div><div class="cc-info">' +
      '<div class="cc-name"><b>' + s.id + '</b><span class="tag">' + s.mode + '</span></div>' +
      '<div style="font-size:12.5px;color:#0f172a;margin-top:2px">' + s.name + '</div>' +
      '<div style="font-size:11.5px;color:#64748b">' + s.model + '</div></div></div>' +
      T('<div class="cc-row">当前 <b style="color:#1d4ed8">' + s.temp.toFixed(1) + '℃</b> / <b style="color:#1d4ed8">' + s.hum + '%</b></div>', '<div class="cc-row">Now <b style="color:#1d4ed8">' + s.temp.toFixed(1) + '℃</b> / <b style="color:#1d4ed8">' + s.hum + '%</b></div>') +
      T('<div class="cc-row">绑定蚊笼 <b>' + (b ? b.id : tr('未绑定')) + '</b> · 每 ' + s.gap + ' 分钟 · 最近 ' + s.last + '</div>', '<div class="cc-row">Cage <b>' + (b ? b.id : tr('未绑定')) + '</b> · every ' + s.gap + ' min · last ' + s.last + '</div>') +
      '<div class="cc-btns"><button class="mini-btn" data-iot-snap="' + s.id + '">' + tr('立即采集') + '</button></div></div>';
  }).join('') : iotEmpty(tr('暂无温湿度传感器：登录米家账号后点「同步设备」自动发现，或按「接入指南」接入。'));
  $('#iot-cams').innerHTML = iotCams.length ? iotCams.map(function(c){
    return '<div class="cage-card"><div class="cc-top"><div class="cc-ico" style="width:46px;height:46px">' + icoSvg('cam') + '</div><div class="cc-info">' +
      '<div class="cc-name"><b>' + c.id + '</b><span class="tag">' + (c.rtsp ? tr('RTSP 就绪') : tr('无 RTSP · 不支持取流')) + '</span></div>' +
      '<div style="font-size:12.5px;color:#0f172a;margin-top:2px">' + c.name + '</div>' +
      '<div style="font-size:11.5px;color:#64748b">' + c.model + '</div></div></div>' +
      T('<div class="cc-row">关联蚊笼 <b>' + c.cage + '</b></div>', '<div class="cc-row">Linked cage <b>' + c.cage + '</b></div>') +
      '<div class="cc-row" style="font-size:11.5px;color:#94a3b8">' + tr('画面经内置连接器播放 · 快照存证') + '</div>' +
      '<div class="cc-btns"><button class="mini-btn" data-iot-cam="' + c.id + '">' + tr('查看画面') + '</button></div></div>';
  }).join('') : iotEmpty(tr('暂无摄像头：登录米家账号后点「同步设备」，建议选用固件带 RTSP 开关的型号。'));
  $('#iot-plugs').innerHTML = iotPlugs.length ? iotPlugs.map(function(p){
    return '<div class="cage-card"><div class="cc-top"><div class="cc-ico" style="width:46px;height:46px;background:' + (p.on ? '#dcfce7' : '#f1f5f9') + ';border-color:' + (p.on ? '#bbf7d0' : '#e2e8f0') + '">' + icoSvg('plug', p.on ? '#16a34a' : '#94a3b8') + '</div><div class="cc-info">' +
      '<div class="cc-name"><b>' + p.id + '</b><span class="tag">' + (p.on ? tr('已开启') : tr('已关闭')) + '</span></div>' +
      '<div style="font-size:12.5px;color:#0f172a;margin-top:2px">' + p.name + '</div>' +
      '<div style="font-size:11.5px;color:#64748b">' + p.model + '</div></div></div>' +
      '<div class="cc-row">' + p.use + '</div>' +
      T('<div class="cc-row">关联 ' + p.cage + '</div>', '<div class="cc-row">Linked ' + p.cage + '</div>') +
      '<div class="cc-btns"><button class="mini-btn ' + (p.on ? 'danger' : '') + '" data-iot-plug="' + p.id + '">' + (p.on ? tr('关闭') : tr('开启')) + '</button></div></div>';
  }).join('') : iotEmpty(tr('暂无插座设备：登录米家账号后点「同步设备」，可远程控制加热垫、风扇与光周期定时。'));
}
function iotSnap(id){
  var s = iotSensors.filter(function(x){ return x.id === id; })[0];
  if (!s) return;
  var b = s.cage && getBatch(s.cage);
  if (!b || b.status !== 'rearing'){ toast(tr('该传感器未绑定在养蚊笼')); return; }
  b.records.push({d:TODAY, tm:s.last, t:'env', temp:s.temp, hum:s.hum, photo:'14:10', by:'自动采集（' + s.id + '）'});
  s.last = '08:00';
  renderAll();
  toast(T('已将 ' + s.id + ' 读数写入 ' + b.id + ' 环境记录', 'Wrote ' + s.id + ' reading into ' + b.id + ' env. records'));
}
function iotCam(id){
  var c = iotCams.filter(function(x){ return x.id === id; })[0];
  if (!c) return;
  $('#cam-title').textContent = c.name + ' · ' + c.id;
  $('#cam-live').textContent = c.rtsp
    ? tr('米家连接器 · 局域网低延迟通道 · 示意画面')
    : tr('该型号无 RTSP 开关，暂不支持取流，建议更换 RTSP 型号');
  showModal('modal-cam');
}
function iotPlug(id){
  var p = iotPlugs.filter(function(x){ return x.id === id; })[0];
  if (!p) return;
  p.on = !p.on;
  renderIot();
  toast(T(p.id + ' 已' + (p.on ? '开启' : '关闭') + '（' + p.use.split(' · ')[0] + '）', p.id + (p.on ? ' switched on' : ' switched off') + ' (' + p.use.split(' · ')[0] + ')'));
}
// ================= v3.0/v3.1：USB 串口环境监测（USB-RS485 + Modbus RTU · 多探头） =================
var serCfg = {port: '', baud: 115200};
var serDemo = false;
var serState = {on: false, timer: 0, last: '—', err: '', readings: [], t0: null, chain: Promise.resolve(), sugKey: '', sugCount: 0};
var serFile = '';
var serDevs = []; // 多探头：同一 RS485 总线手拉手并联，各自不同从站地址 [{id, name, addr, type, start, scale}]；HID 直插设备带 {hid: true, vid, pid}
// v3.4：Modbus 扩展参数设备类型（起始地址/倍率为厂商常见默认值，可按设备修改；寄存器数由类型定死，本期不支持 32 位双寄存器）
var SER_TYPES = {
  th:  {id: 'th',  label: '温湿度',  start: 0, count: 2, scale: 0.1, unit: ''},
  co2: {id: 'co2', label: 'CO₂',    start: 0, count: 1, scale: 1,   unit: 'ppm'},
  lux: {id: 'lux', label: '光照度', start: 0, count: 1, scale: 1,   unit: 'lx'},
  pa:  {id: 'pa',  label: '负压',    start: 0, count: 1, scale: 0.1, unit: 'Pa'}
};
var hidLast = []; // 最近一次 HID 枚举结果（供「添加设备」按索引取详情）
function serPad(n){ return (n < 10 ? '0' : '') + n; }
function serNow(){ var d = new Date(); return serPad(d.getHours()) + ':' + serPad(d.getMinutes()) + ':' + serPad(d.getSeconds()); }
function serI16(v){ v = v | 0; return v > 32767 ? v - 65536 : v; }
function serParse(dev, regs){
  var t = SER_TYPES[dev.type || 'th'] || SER_TYPES.th;
  var s = dev.scale != null && dev.scale > 0 ? dev.scale : t.scale;
  if (t.id === 'th') return {temp: regs[1] * 0.1, hum: regs[0] * 0.1}; // 沿用 SHT 系列默认映射：0x0000 湿度、0x0001 温度（0.1 倍率）
  if (t.id === 'pa') return {pa: serI16(regs[0]) * s};
  var o = {}; o[t.id] = regs[0] * s; return o;
}
function serNormDevs(){
  serDevs.forEach(function(d){
    if (!SER_TYPES[d.type]) d.type = 'th';
    var t = SER_TYPES[d.type];
    if (d.start == null) d.start = t.start;
    if (d.scale == null) d.scale = t.scale;
    if (d.hid) d.hidKey = null; // 刷新后句柄需重开
  });
}
function serLoadDevs(){
  try { serDevs = JSON.parse(localStorage.getItem('mosq.serDevs') || '') || []; } catch(e){ serDevs = []; }
  if (!serDevs.length) serDevs = [{id: 'D1', name: '探头 1', addr: 1, type: 'th', start: 0, scale: 0.1}];
  serNormDevs();
}
function serSaveDevs(){ try { localStorage.setItem('mosq.serDevs', JSON.stringify(serDevs.map(function(d){ return {id: d.id, name: d.name, addr: d.addr, type: d.type, start: d.start, scale: d.scale, hid: d.hid || undefined, vid: d.vid, pid: d.pid, hidPath: d.hidPath}; }))); } catch(e){} }
function serDevAdd(){
  if (serState.on){ toast(tr('监测中不可修改探头列表')); return; }
  var name = ($('#ser-dev-name').value || '').trim() || ('探头 ' + (serDevs.length + 1));
  var addr = parseInt($('#ser-dev-addr').value, 10);
  if (!(addr >= 1 && addr <= 247)){ toast(tr('从站地址需在 1–247 之间')); return; }
  if (serDevs.some(function(d){ return !d.hid && d.addr === addr; })){ toast(tr('该从站地址已存在')); return; }
  var type = $('#ser-dev-type') ? $('#ser-dev-type').value : 'th';
  var t = SER_TYPES[type] || SER_TYPES.th;
  var start = parseInt($('#ser-dev-start') ? $('#ser-dev-start').value : '', 10);
  if (!(start >= 0)) start = t.start;
  var scale = parseFloat($('#ser-dev-scale') ? $('#ser-dev-scale').value : '');
  if (!(scale > 0)) scale = t.scale;
  serDevs.push({id: 'D' + addr + '-' + (serDevs.length + 1), name: name, addr: addr, type: type, start: start, scale: scale});
  $('#ser-dev-name').value = '';
  serSaveDevs(); renderSerDevs();
  toast(tr('探头已添加：') + name + tr(' · 从站地址 ') + addr + T(' · ' + t.label, ' · ' + t.label));
}
// v3.4：TEMPer USB HID 直插设备
function refreshHidDevs(){
  var sel = $('#hid-sel');
  if (!sel || serState.on) return;
  if (!MC_DISK){
    sel.innerHTML = '<option value="">' + tr('浏览器预览不支持 HID') + '</option>';
    return;
  }
  mcInvoke('mc_hid_list', {}).then(function(list){
    hidLast = list || [];
    if (hidLast.length){
      sel.innerHTML = '<option value="">' + tr('选择 HID 设备…') + '</option>' + hidLast.map(function(p, i){
        var hex = function(x){ return x.toString(16).toUpperCase(); };
        return '<option value="' + i + '">' + esc((p.product || 'TEMPer') + ' (' + hex(p.vid) + ':' + hex(p.pid) + (p.serial ? ' · ' + p.serial : '') + ')') + '</option>';
      }).join('');
    } else {
      sel.innerHTML = '<option value="">' + tr('未发现 TEMPer 设备：请插入 USB 温度计') + '</option>';
    }
  }).catch(function(e){
    sel.innerHTML = '<option value="">' + esc(String(e)) + '</option>';
  });
}
function serHidAdd(){
  if (serState.on){ toast(tr('监测中不可修改探头列表')); return; }
  if (!MC_DISK){ toast(tr('桌面版支持 USB 直插温度计（TEMPer 系列）')); return; }
  var idx = parseInt($('#hid-sel').value, 10);
  if (!(idx >= 0) || !hidLast[idx]){ toast(tr('请先刷新并选择 TEMPer 设备')); return; }
  var p = hidLast[idx];
  if (serDevs.some(function(d){ return d.hid && d.vid === p.vid && d.pid === p.pid && d.serial === p.serial; })){ toast(tr('该设备已添加')); return; }
  var name = (p.product || 'TEMPer').slice(0, 24);
  serDevs.push({id: 'H' + (serDevs.length + 1) + '-' + p.pid, name: name, hid: true, vid: p.vid, pid: p.pid, serial: p.serial || '', hidPath: p.path || ''});
  serSaveDevs(); renderSerDevs();
  toast(tr('HID 设备已添加：') + name);
}
function serDevDel(id){
  if (serState.on){ toast(tr('监测中不可修改探头列表')); return; }
  serDevs = serDevs.filter(function(d){ return d.id !== id; });
  if (!serDevs.length) serDevs = [{id: 'D1', name: '探头 1', addr: 1, type: 'th', start: 0, scale: 0.1}];
  serSaveDevs(); renderSerDevs();
}
function renderSerDevs(){
  var box = $('#ser-devs');
  if (!box) return;
  box.innerHTML = serDevs.map(function(d){
    var t = SER_TYPES[d.type || 'th'] || SER_TYPES.th;
    var label = d.hid ? T('USB 直插', 'USB HID') : ' @ ' + d.addr + ' · ' + tr(t.label);
    return '<span class="tag" style="background:#eff6ff;color:#1d4ed8" title="' + (d.hid ? esc(T('TEMPer USB HID 直插', 'TEMPer USB HID')) : esc(T('起始地址 0x' + (d.start || 0).toString(16).toUpperCase() + ' · 倍率 ' + d.scale, 'Start 0x' + (d.start || 0).toString(16).toUpperCase() + ' · scale ' + d.scale))) + '">' + esc(d.name) + label +
      (serState.on ? '' : '<a href="#" onclick="serDevDel(\'' + d.id + '\');return false" style="color:#dc2626;margin-left:5px;text-decoration:none" title="' + tr('删除') + '">×</a>') + '</span>';
  }).join('');
}
function refreshSerialPorts(){
  var sel = $('#ser-port-sel');
  if (!sel || serState.on) return;
  if (!MC_DISK){
    sel.innerHTML = '<option value="">' + tr('浏览器预览：请勾选「模拟读数」体验') + '</option>';
    return;
  }
  mcInvoke('mc_serial_list', {}).then(function(list){
    list = list || [];
    if (list.length){
      sel.innerHTML = '<option value="">' + tr('选择串口…') + '</option>' + list.map(function(p){
        return '<option value="' + esc(p.name) + '">' + esc(p.name + (p.desc ? ' · ' + p.desc : '')) + '</option>';
      }).join('');
    } else {
      sel.innerHTML = '<option value="">' + tr('未发现串口设备：请插入 USB-RS485 适配器') + '</option>';
    }
  }).catch(function(e){
    sel.innerHTML = '<option value="">' + esc(String(e)) + '</option>';
  });
}
function toggleSerial(){ if (serState.on){ serialStop(); } else { serialStart(); } }
function serialStart(){
  var demo = $('#ser-demo').checked;
  var src = $('#ser-src') ? $('#ser-src').value : 'rs485';
  var port = $('#ser-port-sel').value;
  var baud = parseInt($('#ser-baud').value, 10) || 9600;
  if (!demo && src === 'rs485' && !port){ toast(tr('请选择串口，或勾选「模拟读数」')); return; }
  if (!serDevs.length){ toast(tr('请先在探头列表添加探头')); return; }
  if (!demo && src === 'hid' && !serDevs.some(function(d){ return d.hid; })){ toast(tr('USB 直插模式需先添加 HID 设备')); return; }
  if (demo){
    serCfg = {port: tr('模拟串口'), baud: baud, src: 'demo'};
    serDemo = true;
    serialBegin();
    toast(tr('模拟读数已启动（用于无硬件演示）'));
  } else if (src === 'hid'){ // v3.4：TEMPer USB HID 直插（句柄在 serialBegin 逐个打开）
    serCfg = {port: tr('USB 直插（HID）'), baud: 0, src: 'hid'};
    serDemo = false;
    serialBegin();
    toast(tr('已连接 USB 直插设备（HID）'));
  } else {
    mcInvoke('mc_serial_open', {port: port, baud: baud}).then(function(){
      serCfg = {port: port, baud: baud, src: 'rs485'};
      serDemo = false;
      serialBegin();
      toast(tr('已连接 ') + port + T(' · ' + serDevs.length + ' 个探头', ' · ' + serDevs.length + ' probes'));
    }).catch(function(e){ toast(tr('连接失败：') + e); });
  }
}
function serialBegin(){
  var d = new Date();
  serState = {on: true, timer: 0, last: '—', err: '', readings: [], t0: d, chain: Promise.resolve(), sugKey: '', sugCount: 0, sugTexts: []};
  serDevs.forEach(function(dev, i){ dev._t = 25.6 + i * 0.7; dev._h = 72 + i * 3; dev.hidKey = null; }); // 模拟基线：各探头错开
  serFile = 'env_' + d.getFullYear() + serPad(d.getMonth() + 1) + serPad(d.getDate()) + '_' + serPad(d.getHours()) + serPad(d.getMinutes()) + serPad(d.getSeconds()) + '.json';
  $('#ser-btn').textContent = tr('断开');
  renderSerDevs();
  var kick = Promise.resolve();
  if (MC_DISK && !serDemo){ // v3.4：HID 直插设备先开句柄（path 在枚举时记录）
    serDevs.forEach(function(dev){
      if (!dev.hid || !dev.hidPath) return;
      kick = kick.then(function(){
        return mcInvoke('mc_hid_open', {path: dev.hidPath}).then(function(key){ dev.hidKey = key; }).catch(function(e){
          serState.err = dev.name + ': ' + String(e);
        });
      });
    });
  }
  kick.then(function(){
    serialTick();
    serState.timer = setInterval(serialTick, 5000);
    renderSerial();
  });
}
function serialTick(){
  var stamp = serNow();
  if (serDemo){
    serDevs.forEach(function(dev){
      var type = dev.hid ? 'th' : (dev.type || 'th');
      if (type === 'co2'){
        dev._c = Math.round(Math.max(380, Math.min(2200, (dev._c || 650) + (Math.random() - 0.5) * 90)));
        serAccept({t: stamp, dev: dev.id, name: dev.name, addr: dev.addr, co2: dev._c});
      } else if (type === 'lux'){
        dev._l = Math.round(Math.max(0, Math.min(20000, (dev._l || 300) + (Math.random() - 0.5) * 40)));
        serAccept({t: stamp, dev: dev.id, name: dev.name, addr: dev.addr, lux: dev._l});
      } else if (type === 'pa'){
        dev._p = Math.round(Math.max(-50, Math.min(50, (dev._p || 5) + (Math.random() - 0.5) * 4)) * 10) / 10;
        serAccept({t: stamp, dev: dev.id, name: dev.name, addr: dev.addr, pa: dev._p});
      } else {
        dev._t = Math.round(Math.max(18, Math.min(34, dev._t + (Math.random() - 0.5) * 0.8)) * 10) / 10;
        dev._h = Math.round(Math.max(40, Math.min(95, dev._h + (Math.random() - 0.5) * 2.5)));
        serAccept({t: stamp, dev: dev.id, name: dev.name, addr: dev.addr, temp: dev._t, hum: dev._h});
      }
    });
    serState.last = stamp;
    serUpdateSuggest();
    renderSerial();
    return;
  }
  // 同一 RS485 总线为半双工：按列表顺序轮询（Promise 链，不可并发）；HID 直插设备走独立通道，混挂时各取各的
  serDevs.forEach(function(dev){
    serState.chain = serState.chain.then(function(){
      if (serCfg.src === 'hid' && !dev.hid) return; // HID 会话只读 HID 设备
      if (dev.hid){ // v3.4：TEMPer USB HID 读数（temp/hum，缺失通道为 null）
        if (!dev.hidKey) return;
        return mcInvoke('mc_hid_read', {key: dev.hidKey}).then(function(res){
          if (res && (res.temp != null || res.hum != null)){
            serAccept({t: serNow(), dev: dev.id, name: dev.name, hid: true, temp: res.temp, hum: res.hum});
          }
          serState.err = '';
        }).catch(function(e){ serState.err = dev.name + ': ' + String(e); });
      }
      var t = SER_TYPES[dev.type || 'th'] || SER_TYPES.th;
      return mcInvoke('mc_serial_read', {port: serCfg.port, slave: dev.addr, start: dev.start, count: t.count}).then(function(regs){
        var v = serParse(dev, regs); // SHT 系列默认映射见 serParse；四类设备各自解析
        serAccept({t: serNow(), dev: dev.id, name: dev.name, addr: dev.addr, temp: v.temp, hum: v.hum, co2: v.co2, lux: v.lux, pa: v.pa});
        serState.err = '';
      }).catch(function(e){
        serState.err = dev.name + ' @' + dev.addr + ': ' + String(e);
      });
    });
  });
  serState.chain.then(function(){ serUpdateSuggest(); renderSerial(); });
}
function serAccept(r){
  var hasData = [r.temp, r.hum, r.co2, r.lux, r.pa].some(function(v){ return v != null && !isNaN(v); });
  if (!hasData) return; // v3.4：任一通道有值即可入库（CO₂/光照/负压设备无温湿度）
  serState.last = r.t;
  serState.readings.push(r);
  var alerted = false;
  var src = r.hid ? T('USB 直插设备', 'USB HID device') : r.addr + tr(' 号从站');
  if (r.temp != null && !isNaN(r.temp) && (r.temp > thresholds.tempHigh || r.temp < thresholds.tempLow)){
    alerted = addAlert('串口监测温度', T('探头「' + r.name + '」温度 ' + fmt1(r.temp) + '℃ 超出阈值 ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃', 'Probe "' + r.name + '" temperature ' + fmt1(r.temp) + '℃ outside threshold ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃'), 'warn', '', T(src + ' · 触发 ' + fmt1(r.temp) + '℃ / 阈值 ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃（' + serCfg.port + '）', src + ' · triggered ' + fmt1(r.temp) + '℃ / threshold ' + thresholds.tempLow + '–' + thresholds.tempHigh + '℃ (' + serCfg.port + ')'));
  }
  if (r.hum != null && !isNaN(r.hum) && (r.hum > thresholds.humHigh || r.hum < thresholds.humLow)){
    alerted = addAlert('串口监测湿度', T('探头「' + r.name + '」湿度 ' + r.hum + '% 超出阈值 ' + thresholds.humLow + '–' + thresholds.humHigh + '%', 'Probe "' + r.name + '" humidity ' + r.hum + '% outside threshold ' + thresholds.humLow + '–' + thresholds.humHigh + '%'), 'warn', '', T(src + ' · 触发 ' + r.hum + '% / 阈值 ' + thresholds.humLow + '–' + thresholds.humHigh + '%（' + serCfg.port + '）', src + ' · triggered ' + r.hum + '% / threshold ' + thresholds.humLow + '–' + thresholds.humHigh + '% (' + serCfg.port + ')'));
  }
  if (r.co2 != null && !isNaN(r.co2) && r.co2 > thresholds.co2High){ // v3.4：CO₂ 超标预警
    alerted = addAlert('串口监测CO₂', T('探头「' + r.name + '」CO₂ ' + r.co2 + ' ppm 超过阈值 ' + thresholds.co2High + ' ppm', 'Probe "' + r.name + '" CO₂ ' + r.co2 + ' ppm above threshold ' + thresholds.co2High + ' ppm'), 'warn', '', T(src + ' · 触发 ' + r.co2 + ' ppm / 阈值 ' + thresholds.co2High + ' ppm（' + serCfg.port + '）', src + ' · triggered ' + r.co2 + ' ppm / threshold ' + thresholds.co2High + ' ppm (' + serCfg.port + ')'));
  }
  if (alerted) MCStore.save();
  serialPersist();
}
function serialPersist(){
  if (!MC_DISK || serDemo || !serFile || !serState.readings.length) return;
  var payload = {
    kind: 'usb-serial-env', port: serCfg.port, baud: serCfg.baud,
    devices: serDevs.map(function(d){ return {name: d.name, addr: d.addr, type: d.hid ? 'hid-th' : (d.type || 'th'), start: d.start, scale: d.scale, hid: d.hid || undefined}; }), // v3.4：留存类型/映射，便于复现
    started: serState.t0 ? serState.t0.toISOString() : '',
    count: serState.readings.length, readings: serState.readings
  };
  mcInvoke('mc_write', {rel: 'result/' + serFile, content: JSON.stringify(payload)}).catch(function(){});
}
function serialStop(){
  if (!serState.on) return;
  clearInterval(serState.timer);
  serState.timer = 0;
  serState.on = false;
  var port = serCfg.port, n = serState.readings.length;
  serialPersist();
  if (!serDemo && MC_DISK){
    serDevs.forEach(function(dev){ if (dev.hid && dev.hidKey){ mcInvoke('mc_hid_close', {key: dev.hidKey}).catch(function(){}); dev.hidKey = null; } }); // v3.4：释放 HID 句柄
    if (serCfg.src === 'rs485' && port) mcInvoke('mc_serial_close', {port: port}).catch(function(){});
  }
  $('#ser-btn').textContent = tr('连接');
  renderSerDevs();
  renderSerial();
  toast(T('监测已停止，本次共 ' + n + ' 条读数' + (!serDemo && MC_DISK ? '，已留存 result/' + serFile : ''), 'Monitoring stopped — ' + n + ' readings captured' + (!serDemo && MC_DISK ? ' (saved to result/' + serFile + ')' : '')));
}
// v3.4：继电器联动建议（仅页内联提示，不下发任何控制指令）；连续两轮命中同一组合才展示
function serSuggest(){
  var latest = {};
  serState.readings.forEach(function(r){ latest[r.dev] = r; });
  var rules = [];
  serDevs.forEach(function(dev){
    var r = latest[dev.id];
    if (!r) return;
    if (r.temp != null && !isNaN(r.temp) && r.temp > thresholds.tempHigh) rules.push({k: dev.id + ':hot', x: T('「' + dev.name + '」温度偏高（' + fmt1(r.temp) + '℃）→ 建议开启风扇/空调降温', '"' + dev.name + '" temp high (' + fmt1(r.temp) + '℃) → consider fan/AC cooling')});
    else if (r.temp != null && !isNaN(r.temp) && r.temp < thresholds.tempLow) rules.push({k: dev.id + ':cold', x: T('「' + dev.name + '」温度偏低（' + fmt1(r.temp) + '℃）→ 建议开启加热保温', '"' + dev.name + '" temp low (' + fmt1(r.temp) + '℃) → consider heating')});
    if (r.hum != null && !isNaN(r.hum) && r.hum < thresholds.humLow) rules.push({k: dev.id + ':dry', x: T('「' + dev.name + '」湿度偏低（' + r.hum + '%）→ 建议开启加湿', '"' + dev.name + '" RH low (' + r.hum + '%) → consider humidifying')});
    else if (r.hum != null && !isNaN(r.hum) && r.hum > thresholds.humHigh) rules.push({k: dev.id + ':wet', x: T('「' + dev.name + '」湿度偏高（' + r.hum + '%）→ 建议开启通风除湿', '"' + dev.name + '" RH high (' + r.hum + '%) → consider dehumidifying')});
    if (r.co2 != null && !isNaN(r.co2) && r.co2 > thresholds.co2High) rules.push({k: dev.id + ':co2', x: T('「' + dev.name + '」CO₂ 偏高（' + r.co2 + ' ppm）→ 建议通风换气', '"' + dev.name + '" CO₂ high (' + r.co2 + ' ppm) → consider ventilation')});
  });
  return rules;
}
function serUpdateSuggest(){
  var rules = serSuggest();
  var key = rules.map(function(x){ return x.k; }).join('|'); // 键只含规则命中，不含数值：数值漂移不影响连续计数
  if (key && key === serState.sugKey) serState.sugCount++;
  else { serState.sugKey = key; serState.sugCount = key ? 1 : 0; }
  serState.sugTexts = rules.map(function(x){ return x.x; });
}
function renderSerial(){
  var live = $('#ser-live');
  if (!live) return;
  var btn = $('#ser-btn');
  if (btn) btn.textContent = tr(serState.on ? '断开' : '连接'); // 语言切换后同步动态按钮标签
  if (!serState.on){
    live.innerHTML = '<div class="ana-note" style="margin-top:10px">' + tr('未连接。选择接入方式并点「连接」开始每 5 秒顺序轮询全部探头；无硬件时勾选「模拟读数」体验全流程。') + '</div>';
    drawSerChart();
    return;
  }
  function badge(ok){ return '<span class="badge" style="' + (ok ? 'background:#dcfce7;color:#166534' : 'background:#fef2f2;color:#b91c1c') + '">' + (ok ? tr('正常') : tr('超阈值')) + '</span>'; }
  var cards = serDevs.map(function(dev, i){
    var r = null;
    for (var k = serState.readings.length - 1; k >= 0; k--){ if (serState.readings[k].dev === dev.id){ r = serState.readings[k]; break; } }
    var type = dev.hid ? 'th' : (dev.type || 'th');
    var t = r ? r.temp : null, h = r ? r.hum : null, c = r ? r.co2 : null;
    var ok = type === 'co2' ? (c != null && !isNaN(c) && c <= thresholds.co2High)
           : type === 'th' ? (t != null && !isNaN(t) && t >= thresholds.tempLow && t <= thresholds.tempHigh && h != null && !isNaN(h) && h >= thresholds.humLow && h <= thresholds.humHigh)
           : true; // 光照/负压本期无限值判定
    var big = (t != null && !isNaN(t) ? fmt1(t) + '℃' : '—') + ' <span style="font-size:15px;color:#0284c7">' + (h != null && !isNaN(h) ? h + '%' : (type === 'th' ? '—' : '')) + '</span>';
    var extra = [];
    if (c != null && !isNaN(c)) extra.push(c + ' ppm');
    if (r && r.lux != null && !isNaN(r.lux)) extra.push(r.lux + ' lx');
    if (r && r.pa != null && !isNaN(r.pa)) extra.push(fmt1(r.pa) + ' Pa');
    return '<div class="cage-card" style="border-top:3px solid ' + sciPalette[i % sciPalette.length] + '">' +
      '<div class="cc-row" style="font-size:12px;color:#475569"><b style="color:' + sciPalette[i % sciPalette.length] + '">' + esc(dev.name) + '</b> ' + (dev.hid ? 'USB' : '@ ' + dev.addr) + ' ' + badge(ok) + '</div>' +
      '<div style="font-size:22px;font-weight:700;color:#1d4ed8;margin:2px 0">' + big + '</div>' +
      (extra.length ? '<div style="font-size:12.5px;color:#0f172a;margin:2px 0">' + extra.join(' · ') + '</div>' : '') +
      '<div class="cc-row" style="font-size:11.5px;color:#94a3b8">' + (type === 'co2' ? tr('阈值 ') + 'CO₂ ≤ ' + thresholds.co2High + ' ppm' : tr('阈值 ') + thresholds.tempLow + '–' + thresholds.tempHigh + '℃ / ' + thresholds.humLow + '–' + thresholds.humHigh + '%') +
      '<br>' + (r ? tr('最近 ') + r.t : tr('正在积累读数…')) + '</div></div>';
  }).join('');
  cards += '<div class="cage-card"><div class="cc-row" style="font-size:12px;color:#64748b">' + tr('监测状态') + '</div>' +
    '<div style="font-size:13px;color:#0f172a;line-height:1.8">' + esc(serCfg.port) + ' · ' + serDevs.length + tr(' 个探头 · 每 5 秒顺序轮询 · 最近 ') + serState.last + '<br>' + tr('已记录 ') + serState.readings.length + tr(' 条读数') +
    (serState.err ? '<br><span style="color:#b91c1c">' + esc(serState.err) + '</span>' : '') + '</div></div>';
  var sug = (serState.sugCount >= 2 && serState.sugTexts.length) ? '<div class="ana-note" style="margin-top:10px;background:#fffbeb;border:1px solid #fcd34d;color:#92400e"><b>' + tr('联动建议') + '</b> · ' + tr('仅内联建议，不下发任何控制指令') + '：' + serState.sugTexts.map(function(s){ return esc(s); }).join('；') + '</div>' : '';
  live.innerHTML = sug + '<div class="cage-grid" style="margin-top:10px">' + cards + '</div>';
  drawSerChart();
}
// v3.1：多探头实时温湿度曲线（左轴温度自适应 + 阈值带，右轴湿度 0–100%，实线温度 / 虚线湿度）
function drawSerChart(){
  var cv = $('#ser-chart');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  var tail = serState.readings.slice(-144); // 最近 144 条读数 ≈ 12 分钟窗口
  var n = tail.length;
  if (!n){
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px "Segoe UI","Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tr('实时曲线：连接后自动绘制最近 12 分钟各探头温湿度（实线 温度 / 虚线 湿度）'), W / 2, H / 2);
    return;
  }
  var PADL = 44, PADR = 40, PADT = 12, PADB = 22;
  var PW = W - PADL - PADR, PH = H - PADT - PADB;
  var tMin = Math.min(thresholds.tempLow, 1e9), tMax = Math.max(thresholds.tempHigh, -1e9);
  tail.forEach(function(r){ if (r.temp != null){ tMin = Math.min(tMin, r.temp); tMax = Math.max(tMax, r.temp); } });
  if (tMin === 1e9){ tMin = 20; tMax = 30; }
  var pad = Math.max(1, (tMax - tMin) * 0.15);
  tMin = Math.floor(tMin - pad); tMax = Math.ceil(tMax + pad);
  function xAt(i){ return PADL + (n <= 1 ? PW / 2 : (i / (n - 1)) * PW); }
  function yT(v){ return PADT + (1 - (v - tMin) / (tMax - tMin)) * PH; }
  function yH(v){ return PADT + (1 - v / 100) * PH; }
  ctx.fillStyle = 'rgba(37,99,235,.07)'; // 温度阈值带
  ctx.fillRect(PADL, yT(thresholds.tempHigh), PW, Math.max(1, yT(thresholds.tempLow) - yT(thresholds.tempHigh)));
  ctx.strokeStyle = '#e2e8f0'; ctx.fillStyle = '#94a3b8'; ctx.font = '10px "Segoe UI",sans-serif';
  ctx.textAlign = 'right';
  for (var g = 0; g <= 4; g++){
    var tv = tMin + (tMax - tMin) * g / 4, y = yT(tv);
    ctx.beginPath(); ctx.moveTo(PADL, y); ctx.lineTo(W - PADR, y); ctx.stroke();
    ctx.fillText(Math.round(tv) + '℃', PADL - 4, y + 3);
  }
  ctx.textAlign = 'left';
  [0, 50, 100].forEach(function(hv){ ctx.fillText(hv + '%', W - PADR + 4, yH(hv) + 3); });
  serDevs.forEach(function(dev, di){
    var col = sciPalette[di % sciPalette.length], ptsT = [], ptsH = [];
    tail.forEach(function(r, i){ // v3.4：CO₂/光照/负压设备无温湿度通道，缺失值不进曲线，避免 NaN 断线
      if (r.dev !== dev.id) return;
      if (r.temp != null && !isNaN(r.temp)) ptsT.push([i, r.temp]);
      if (r.hum != null && !isNaN(r.hum)) ptsH.push([i, r.hum]);
    });
    if (!ptsT.length && !ptsH.length) return;
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); // 实线：温度（左轴）
    ptsT.forEach(function(p, k){ k ? ctx.lineTo(xAt(p[0]), yT(p[1])) : ctx.moveTo(xAt(p[0]), yT(p[1])); });
    ctx.stroke();
    ctx.globalAlpha = 0.55; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.2; ctx.beginPath(); // 虚线：湿度（右轴）
    ptsH.forEach(function(p, k){ k ? ctx.lineTo(xAt(p[0]), yH(p[1])) : ctx.moveTo(xAt(p[0]), yH(p[1])); });
    ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  });
  ctx.font = '10.5px "Segoe UI","Microsoft YaHei",sans-serif'; ctx.textAlign = 'left';
  var lx = PADL;
  serDevs.forEach(function(dev, di){
    var t0 = SER_TYPES[dev.type || 'th'] || SER_TYPES.th;
    var label = (dev.hid || t0.id === 'th') ? dev.name + T(' 实线 温度 · 虚线 湿度', ' solid temp · dashed RH') : dev.name + ' · ' + tr(t0.label) + T('（无温湿度通道）', ' (no temp/RH)');
    ctx.fillStyle = sciPalette[di % sciPalette.length];
    ctx.fillRect(lx, H - 10, 10, 3);
    ctx.fillStyle = '#475569';
    ctx.fillText(label, lx + 14, H - 6);
    lx += ctx.measureText(label).width + 26;
  });
}
// ================= v3.1：标准限值模板（WHO / IAEA） =================
var THR_PRESETS = [
  {id: 'default', n: '常规饲养（本室默认）', d: '24–28℃ / 65–85%RH', t: {tempLow: 24, tempHigh: 28, humLow: 65, humHigh: 85}},
  {id: 'who_contact', n: 'WHO 成蚊接触测定', d: '25±2℃ / 80±10%RH', t: {tempLow: 23, tempHigh: 27, humLow: 70, humHigh: 90}},
  {id: 'who_bottle', n: 'WHO 瓶测定', d: '27±2℃ / 湿度不限', t: {tempLow: 25, tempHigh: 29, humLow: 60, humHigh: 90}},
  {id: 'iaea_aedes', n: 'IAEA 伊蚊规模化饲养', d: '26±1℃ / 70±5%RH', t: {tempLow: 25, tempHigh: 27, humLow: 65, humHigh: 75}}
];
function initThrPreset(){
  var sel = $('#thr-preset');
  if (!sel || sel.options.length) return;
  sel.innerHTML = '<option value="">' + tr('选择标准模板…') + '</option>' + THR_PRESETS.map(function(p){
    return '<option value="' + p.id + '">' + esc(tr(p.n) + '（' + tr(p.d) + '）') + '</option>';
  }).join('');
}
function applyThrPreset(id){
  var p = null;
  THR_PRESETS.forEach(function(x){ if (x.id === id) p = x; });
  if (!p) return;
  thresholds.tempLow = p.t.tempLow; thresholds.tempHigh = p.t.tempHigh;
  thresholds.humLow = p.t.humLow; thresholds.humHigh = p.t.humHigh;
  $('#th-temp-low').value = p.t.tempLow; $('#th-temp-high').value = p.t.tempHigh;
  $('#th-hum-low').value = p.t.humLow; $('#th-hum-high').value = p.t.humHigh;
  toast(tr('已应用标准限值：') + tr(p.n) + tr('（仅影响此后检测）'));
}
// ================= v3.1：血饲-产卵日历提醒 =================
// FAO/IAEA：雌蚊吸血后约 3 天开始产卵（第 3–5 天为高峰）；出现产卵证据（子笼起始不早于预计日）后不再提醒
function checkOvipReminder(){
  batches.forEach(function(b){
    if (b.status !== 'rearing') return;
    var bf = null;
    (b.records || []).forEach(function(r){
      if (r.t === 'feed' && r.type === '血饲'){
        var k = r.d + ' ' + (r.tm || '');
        if (!bf || k > bf.k) bf = {k: k, d: r.d};
      }
    });
    if (!bf) return;
    var exp = new Date(new Date(bf.d).getTime() + 3 * 86400000);
    var expStr = exp.getFullYear() + '-' + serPad(exp.getMonth() + 1) + '-' + serPad(exp.getDate());
    if (TODAY < expStr) return;
    var laid = batches.some(function(c){ return c.parent === b.id && c.start >= expStr; }); // 已收集产卵（子笼）
    if (laid) return;
    addAlert('产卵预计', T(b.id + ' 血饲 ' + bf.d + '，预计 ' + expStr + ' 起产卵（血饲后约 3 天）', b.id + ' blood-fed ' + bf.d + '; oviposition expected from ' + expStr + ' (~3 days post-bloodmeal)'), 'info', b.id,
      T('请准备产卵杯（湿滤纸 / 纱布）；第 3–5 天为产卵高峰，可次日收集卵并新建子笼。', 'Prepare an oviposition cup (moist filter paper / gauze); peak laying is days 3–5 — collect eggs the next morning and start a sub-cage.'));
  });
}
// ================= v3.3：发育预测（积温模型 GDD） =================
// 参数来源：文献值（内置热常数按品系拉丁名自动匹配）；同品系已结束笼 n≥6 时启用本地校准覆盖
function fcParams(b){
  var s = strains[b.strain];
  var lit = MosqForecast.paramsFor(s && s.latin);
  if (!lit) return null;
  var closed = batches.filter(function(x){ return x.strain === b.strain && x.status === 'closed'; });
  var cal = MosqForecast.calibrateStrain(closed);
  if (cal.ok) return {T0:cal.T0, K:cal.K, udt:lit.udt, ref:'校准值', note:'本地回归 n=' + cal.n + ' 笼（覆盖文献默认值）', src:'calib'};
  return {T0:lit.T0, K:lit.K, udt:lit.udt, ref:'文献值', note:lit.note, src:'lit'};
}
var FC_STATUS_TXT = {
  imminent:      ['已累计足额有效积温并进入蛹期，预计随时羽化', 'Full GDD accumulated and pupa reached — emergence expected any day'],
  normal:        ['积温轨道与实际阶段推进基本一致', 'GDD track broadly matches actual stage progress'],
  ahead:         ['积温轨道超前于实际阶段推进', 'GDD track runs ahead of actual stage progress'],
  ahead_severe:  ['积温轨道明显超前于实际阶段推进', 'GDD track runs far ahead of actual stage progress'],
  behind:        ['积温轨道落后于实际阶段推进', 'GDD track lags behind actual stage progress'],
  behind_severe: ['积温轨道明显落后于实际阶段推进', 'GDD track lags far behind actual stage progress']
};
var FC_STATUS_HINT = {
  imminent:      ['请提前准备羽化笼、糖水与实验排期。', 'Prepare the emergence cage, sugar water and experiment schedule.'],
  normal:        ['继续按计划饲养观察。', 'Continue rearing as planned.'],
  ahead:         ['可能因温度偏高或文献 K 偏小（株间差异）；建议核对环境温度，积累已结束蚊笼后在科研分析中本地校准。', 'Possibly higher temperature or literature K too small (strain variation); verify temperature and calibrate locally in Research once enough cages close.'],
  ahead_severe:  ['文献 K 可能明显不适用本品系，或温度读数偏高（水温与气温存在偏差）；建议核对温度并优先本地校准。', 'Literature K may not fit this strain, or readings run high (water vs air temperature); verify temperature and calibrate locally first.'],
  behind:        ['实际发育快于积温预期（文献 K 偏大）或水温低于室温。', 'Actual development faster than the GDD expectation (literature K too large), or water temperature below room temperature.'],
  behind_severe: ['发育明显慢于温度预期：请检查水温、幼虫密度、饲料与水质。', 'Development clearly slower than temperature suggests: check water temperature, density, diet and water quality.']
};
function fcFootnote(p, fc){
  return T(
    '预测基于笼环境温度的线性积温模型：GDD = Σ max(0, min(T̄日, 上限) − T₀)，预计羽化日 = 今日 + 剩余积温 ÷ 近 7 个实测日均积温（无实测时按 26℃ 假设）；环境记录缺失日顺延前值，连续缺失超 3 天或无记录按 26℃ 假设计入。参数：' +
    (p.src === 'calib' ? tr('校准值') + '（' + p.note + '）' : tr('文献值') + '（' + p.ref + '；' + p.note + '）') +
    '。本预测为相关性参考而非因果结论：未纳入密度、饲料、水质、光照等因子；幼虫实际受水温驱动，与室温存在系统偏差；文献热常数存在株间差异（±20–30%），建议积累已结束蚊笼后在「统计分析 → 科研分析」本地校准。',
    'Forecast based on a linear degree-day model on cage-environment temperature: GDD = Σ max(0, min(T̄, UDT) − T₀); expected emergence = today + remaining GDD ÷ mean daily GDD of the last 7 measured days (26℃ assumed when unmeasured); missing days carry the previous value forward, gaps over 3 days or without a prior value assume 26℃. Parameters: ' +
    (p.src === 'calib' ? 'calibrated (' + p.note + ')' : 'literature (' + p.ref + '; ' + p.note + ')') +
    '. Correlation only, not causal: density, diet, water quality and light are not modelled; larvae are driven by water temperature, which deviates from room temperature; literature constants vary ±20–30% between strains — calibrate locally in Statistics → Research after enough cages close.');
}
function renderForecastCard(b){
  var box = $('#bd-forecast');
  if (!box) return;
  if (b.status !== 'rearing'){ box.innerHTML = ''; return; }
  var p = fcParams(b);
  var head = '<div class="region" style="margin-top:12px"><div class="region-title">' + tr('发育预测（积温模型 GDD）') + (p ?
    '<span class="tag" style="background:' + (p.src === 'calib' ? '#ecfdf5;color:#047857' : '#eff6ff;color:#1d4ed8') + '">' + tr(p.ref) + ' · T₀ ' + p.T0 + '℃ / K ' + p.K + ' 日·度</span>' : '') + '</div>';
  if (!p){
    box.innerHTML = head + '<div class="empty" style="margin-top:8px">' + T('未识别品系物种拉丁名，无匹配的文献热常数；请补全品系「拉丁名」后重试。', 'Species Latin name not recognized — no matching literature thermal constants; complete the strain Latin name first.') + '</div></div>';
    return;
  }
  var fc = MosqForecast.forecastCage(b, p, TODAY);
  if (fc.status === 'done'){
    box.innerHTML = head + '<div style="font-size:12.5px;color:#475569;padding:2px 12px 6px">' + T('本笼已进入成虫期，发育预测完成；成虫期管理请使用饲喂 / 实验处理 / 产卵提醒。', 'This cage has reached the adult stage — forecast complete; use feeding / experiment records and oviposition reminders for adults.') + '</div>' +
      '<div class="ana-note">' + fcFootnote(p, fc) + '</div></div>';
    return;
  }
  var etaHtml = '—';
  if (fc.status === 'imminent' || fc.remain <= 0) etaHtml = '<b>' + tr('已达标 · 随时羽化') + '</b>';
  else if (fc.etaDate) etaHtml = '<b>' + fc.etaDate + '</b>' + T('（约 ' + fc.etaDays + ' 天后）', ' (~' + fc.etaDays + ' d)');
  var st = FC_STATUS_TXT[fc.status] || FC_STATUS_TXT.normal;
  var hint = FC_STATUS_HINT[fc.status] || FC_STATUS_HINT.normal;
  var tagBg = fc.status === 'normal' ? '#f0fdf4;color:#15803d' : (fc.status === 'imminent' ? '#fffbeb;color:#b45309' : (fc.status.indexOf('ahead') === 0 ? '#eff6ff;color:#1d4ed8' : '#fef2f2;color:#b91c1c'));
  var kpis = '<div class="kpis" style="grid-template-columns:repeat(4,1fr);margin-top:8px">' +
    '<div class="kpi"><div class="kv">' + etaHtml + '</div><div class="kl">' + tr('预计羽化日') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + fc.gdd + ' / ' + fc.K + '</div><div class="kl">' + tr('已累计有效积温（日·度）') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + fc.progress + '%</div><div class="kl">' + tr('积温轨道进度') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + fc.coverage + '%</div><div class="kl">' + tr('环境记录覆盖') + '</div></div></div>';
  // 双轨进度条：蓝色 = 积温轨道进度，琥珀刻线 = 实际阶段序进度
  var gddW = Math.min(100, fc.progress), actW = Math.min(99, Math.max(0, fc.actual));
  var bar = '<div style="position:relative;height:16px;background:#eef2f6;border-radius:8px;overflow:hidden;margin-top:10px">' +
    '<div style="position:absolute;left:0;top:0;bottom:0;width:' + gddW + '%;background:#3b82f6"></div>' +
    '<div style="position:absolute;left:' + actW + '%;top:0;bottom:0;width:3px;background:#f59e0b"></div></div>' +
    '<div class="legend-row" style="margin-top:6px"><span><span class="lg-dot" style="background:#3b82f6"></span>' + tr('积温轨道进度') + ' ' + fc.progress + '%</span>' +
    '<span><span class="lg-dot" style="background:#f59e0b"></span>' + tr('实际阶段进度') + ' ' + fc.actual + '%（' + tr(b.stage) + '）</span>' +
    '<span>' + T('日均积温 ', 'Mean daily GDD ') + fc.rate + ' 日·度' + (fc.rateSrc === 'env' ? T('（实测）', ' (measured)') : T('（26℃ 假设）', ' (26℃ assumed)')) + '</span></div>';
  var statusLine = '<div style="margin-top:10px;font-size:12.5px"><span class="tag" style="background:' + tagBg + '">' + T(st[0], st[1]) + T('（偏差 ', ' (deviation ') + (fc.dev > 0 ? '+' : '') + fc.dev + T(' 个百分点）', ' pp)') + '</span> ' +
    '<span style="color:#475569">' + T(hint[0], hint[1]) + '</span></div>';
  box.innerHTML = head + kpis + bar + statusLine + '<div class="ana-note" style="margin-top:10px">' + fcFootnote(p, fc) + '</div></div>';
}
// —— 发育偏差预警（沿用 open + type + batch 去重） ——
function checkForecastDeviation(){
  batches.forEach(function(b){
    if (b.status !== 'rearing') return;
    var p = fcParams(b); if (!p) return;
    var fc = MosqForecast.forecastCage(b, p, TODAY);
    if (fc.status === 'imminent'){
      addAlert('发育预测', T(b.id + ' 已累计足额有效积温（' + fc.gdd + '/' + fc.K + ' 日·度）并进入蛹期，预计随时羽化', b.id + ' has accumulated the full GDD (' + fc.gdd + '/' + fc.K + ' DD) and reached pupa — emergence imminent'), 'info', b.id,
        T('请提前准备羽化笼、糖水与实验排期。', 'Prepare the emergence cage, sugar water and experiment schedule.'));
    } else if (fc.status === 'ahead' || fc.status === 'ahead_severe'){
      addAlert('发育偏差', T(b.id + ' 积温轨道超前实际阶段推进 ' + fc.dev + ' 个百分点（' + fc.progress + '% vs ' + fc.actual + '%）', b.id + ' GDD track ahead of stage progress by ' + fc.dev + ' pp (' + fc.progress + '% vs ' + fc.actual + '%)'), fc.status === 'ahead_severe' ? 'warn' : 'info', b.id,
        T('可能因温度偏高或文献 K 偏小（株间差异 ±20–30%）；建议核对环境温度，并在科研分析中本地校准。', 'Possibly higher temperature or literature K too small (±20–30% strain variation); verify temperature and calibrate locally in Research.'));
    } else if (fc.status === 'behind' || fc.status === 'behind_severe'){
      addAlert('发育偏差', T(b.id + ' 积温轨道落后实际阶段推进 ' + Math.abs(fc.dev) + ' 个百分点（' + fc.progress + '% vs ' + fc.actual + '%）', b.id + ' GDD track behind stage progress by ' + Math.abs(fc.dev) + ' pp (' + fc.progress + '% vs ' + fc.actual + '%)'), fc.status === 'behind_severe' ? 'warn' : 'info', b.id,
        T('发育与温度预期不符：请检查水温、幼虫密度、饲料与水质。', 'Development inconsistent with temperature: check water temperature, density, diet and water quality.'));
    }
  });
}
// —— 科研分析（生存分析页签）：预测参数校准 + 羽化产量区间 ——
function renderResearchForecast(){
  var calBox = $('#sci-cal'), yBox = $('#sci-yield');
  if (!calBox || !yBox) return;
  var closed = anaClosed();
  var groups = [];
  closed.forEach(function(b){
    var g = null;
    for (var i = 0; i < groups.length; i++){ if (groups[i].strain === b.strain){ g = groups[i]; break; } }
    if (!g){ g = {strain:b.strain, cages:[]}; groups.push(g); }
    g.cages.push(b);
  });
  if (!groups.length){
    calBox.innerHTML = '<div class="region" style="margin-top:12px"><div class="region-title">' + tr('预测参数校准（T₀ / K）') + '</div>' +
      '<div class="empty" style="margin-top:8px">' + T('暂无已结束蚊笼：结束后此处将基于「发育历期 × 平均温度」回归校准本株发育参数（T₀ / K）。', 'No closed cages yet: once cages close, T₀ / K will be calibrated here by regressing development duration on mean temperature.') + '</div></div>';
    yBox.innerHTML = '';
    return;
  }
  // ① 参数校准（1/D × T̄ 线性回归，n≥6 启用并覆盖文献默认值）
  var rows = '';
  groups.forEach(function(g){
    var cal = MosqForecast.calibrateStrain(g.cages);
    var lit = MosqForecast.paramsFor(strains[g.strain] && strains[g.strain].latin);
    var src, t0, k;
    if (cal.ok){ src = tr('校准值') + T('（本地回归 n=' + cal.n + '）', ' (local regression, n=' + cal.n + ')'); t0 = cal.T0; k = cal.K; }
    else if (lit){ src = tr('文献值') + T('（有效样本 ' + cal.n + '/6，未启用校准）', ' (valid samples ' + cal.n + '/6 — calibration not enabled)'); t0 = lit.T0; k = lit.K; }
    else { src = tr('无匹配物种参数'); t0 = '—'; k = '—'; }
    rows += '<tr><td>' + tr(strains[g.strain].name) + '</td><td>' + cal.n + '</td><td>' + t0 + '</td><td>' + k + '</td><td>' + src + '</td></tr>';
  });
  var sampleNotes = groups.map(function(g){
    var cal = MosqForecast.calibrateStrain(g.cages);
    if (!cal.samples.length) return '';
    return tr(strains[g.strain].name) + T('：', ': ') + cal.samples.map(function(s){ return s.id + ' ' + s.T + '℃ / ' + s.D + T(' 天', ' d'); }).join(' · ');
  }).filter(Boolean).join('<br>');
  calBox.innerHTML = '<div class="region" style="margin-top:12px"><div class="region-title">' + tr('预测参数校准（T₀ / K）') + '</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + tr('品系') + '</th><th>' + tr('有效样本') + '</th><th>T₀（℃）</th><th>' + tr('K（日·度）') + '</th><th>' + tr('参数来源') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    (sampleNotes ? '<div style="font-size:11.5px;color:#64748b;margin-top:6px">' + sampleNotes + '</div>' : '') +
    '<div class="ana-note">' + tr('校准方法：对同品系已结束且记录至成虫期的蚊笼做 1/D = (T̄ − T₀)/K 线性回归（最小二乘），T̄ 取蚊笼平均温度或环境记录均值；有效样本 ≥6 笼才启用校准并覆盖文献默认值，否则沿用文献值。结果受样本量与温度记录质量限制，随数据积累自动更新。') + '</div></div>';
  // ② 羽化产量区间（历史分布外推 · 非因果预测；n≥10 才显示）
  var yRows = '';
  groups.forEach(function(g){
    var y = MosqForecast.yieldByStrain(g.cages);
    var name = tr(strains[g.strain].name);
    if (y.ok){
      var est = batches.filter(function(x){ return x.strain === g.strain && x.status === 'rearing'; }).map(function(x){
        return x.id + '（' + x.eggs + T(' 粒卵', ' eggs') + '）→ ' + Math.round(x.eggs * y.p10 / 100) + '–' + Math.round(x.eggs * y.p50 / 100) + '–' + Math.round(x.eggs * y.p90 / 100) + T(' 只', ' adults');
      }).join('；') || '—';
      yRows += '<tr><td>' + name + '</td><td>' + y.n + '</td><td class="surv">' + y.p10 + '%</td><td class="surv">' + y.p50 + '%</td><td class="surv">' + y.p90 + '%</td><td>' + est + '</td></tr>';
    } else {
      yRows += '<tr><td>' + name + '</td><td>' + y.n + '</td><td colspan="4" style="color:#64748b">' + T('样本不足（' + y.n + '/10 批次），暂不显示区间；继续积累已结束蚊笼后自动启用。', 'Insufficient samples (' + y.n + '/10 closed cages) — interval hidden; it appears automatically after more cages close.') + '</td></tr>';
    }
  });
  yBox.innerHTML = '<div class="region" style="margin-top:12px"><div class="region-title">' + tr('羽化产量区间（历史分布外推）') + '</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + tr('品系') + '</th><th>' + tr('已结束笼数') + '</th><th>P10</th><th>P50</th><th>P90</th><th>' + tr('在养笼预估区间（羽化成虫）') + '</th></tr></thead><tbody>' + yRows + '</tbody></table></div>' +
    '<div class="ana-note">' + tr('区间为同品系已结束蚊笼累积存活率（终末成虫 / 起始卵）的 P10/P50/P90 分位 × 在养笼起始卵量的历史分布外推，属于相关性参考而非因果预测；实际产量受密度、饲料、水质与操作等因子影响。样本 <10 批次不显示（沿用统计分析「样本不足不呈现」原则）。') + '</div></div>';
}
// ================= v3.4：Brière 发育速率拟合（科研区展示） =================
// 样本复用 MosqForecast.calibrateStrain 的 {id,T,D,r}；拟合由 algo/briere.v0.1.js 完成，样本不足诚实拒绝
function linR2Of(samples){
  var n = samples.length, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  samples.forEach(function(s){ sx += s.T; sy += s.r; sxx += s.T * s.T; syy += s.r * s.r; sxy += s.T * s.r; });
  var vx = sxx - sx * sx / n, vy = syy - sy * sy / n, cov = sxy - sx * sy / n;
  if (!(vx > 0) || !(vy > 0)) return null;
  return Math.round(cov * cov / (vx * vy) * 10000) / 10000;
}
function renderBriere(){
  var box = $('#sci-briere');
  if (!box) return;
  var closed = anaClosed();
  var groups = [];
  closed.forEach(function(b){
    var g = null;
    for (var i = 0; i < groups.length; i++){ if (groups[i].strain === b.strain){ g = groups[i]; break; } }
    if (!g){ g = {strain: b.strain, cages: []}; groups.push(g); }
    g.cages.push(b);
  });
  if (!groups.length){
    box.innerHTML = '<div class="region" style="margin-top:12px"><div class="region-title">' + tr('Brière 发育速率拟合（科研）') + '</div>' +
      '<div class="empty" style="margin-top:8px">' + T('暂无已结束蚊笼：结束后此处将基于「发育历期 × 平均温度」拟合 Brière 非线性发育速率曲线。', 'No closed cages yet: once cages close, a Brière nonlinear development-rate curve will be fitted here from "duration × mean temperature".') + '</div></div>';
    return;
  }
  var rows = '', curves = [];
  groups.forEach(function(g){
    var name = tr(strains[g.strain].name);
    var cal = MosqForecast.calibrateStrain(g.cages);
    var fit = MosqBriere.fit(cal.samples);
    if (!fit.ok){
      rows += '<tr><td>' + name + '</td><td>' + fit.n + '</td><td>' + fit.span + '</td><td colspan="5" style="color:#64748b">' +
        T('样本不足，暂不拟合（需 ≥' + fit.needN + ' 个有效样本且温度跨度 ≥' + fit.needSpan + '℃；当前 ' + fit.n + ' 个 / ' + fit.span + '℃）', 'Insufficient samples — fitting withheld (needs ≥' + fit.needN + ' valid samples and ≥' + fit.needSpan + '℃ span; current ' + fit.n + ' / ' + fit.span + '℃)') + '</td></tr>';
      return;
    }
    var lr2 = linR2Of(cal.samples);
    rows += '<tr><td>' + name + '</td><td>' + fit.n + '</td><td>' + fit.span + '</td><td>' + fit.c + '</td><td>' + fit.T0 + '</td><td>' + fit.TL + '</td><td class="surv">' + fit.r2 + (fit.weak ? ' ⚠' : '') + '</td><td>' + (lr2 == null ? '—' : lr2) + '</td></tr>';
    curves.push({name: name, fit: fit});
  });
  box.innerHTML = '<div class="region" style="margin-top:12px"><div class="region-title">' + tr('Brière 发育速率拟合（科研）') + '</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + tr('品系') + '</th><th>' + tr('有效样本') + '</th><th>' + tr('温度跨度（℃）') + '</th><th>c</th><th>T₀（℃）</th><th>T_L（℃）</th><th>r²</th><th>' + tr('线性回归 r²（对比）') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    (curves.length ? '<canvas id="briere-chart" width="680" height="250" style="width:100%;max-width:680px;margin-top:10px"></canvas>' : '') +
    '<div class="ana-note">' + tr('拟合 Brière 模型 r(T) = c·T·(T−T₀)·(T_L−T)^0.5：对 (T₀, T_L) 以 0.5℃ 网格搜索取 r² 最大组合，c 为过原点最小二乘解析解；样本 <4 个或温度跨度 <5℃ 时诚实拒绝拟合，r²<0.5 以 ⚠ 标记提示拟合较弱。该模型为经验描述（相关性参考而非因果预测），仅在样本温度区间 [T₀, T_L] 内有效，外插不可靠；末列为同样本线性积温回归（1/D × T̄）的 r²，供模型选择参考。') + '</div></div>';
  drawBriereChart(curves);
}
function drawBriereChart(curves){
  var cv = $('#briere-chart');
  if (!cv || !cv.getContext || !curves.length) return;
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  var PAL = ['#2563eb', '#0ea5e9', '#7c3aed', '#059669', '#d97706'];
  var PADL = 52, PADR = 16, PADT = 24, PADB = 26;
  var PW = W - PADL - PADR, PH = H - PADT - PADB;
  var rMax = 0, tMin = 1e9, tMax = -1e9;
  curves.forEach(function(c){
    var f = c.fit;
    for (var T = f.T0; T <= f.TL + 1e-9; T += 0.5){ // 模型峰值可能高于样本点，一并纳入量程
      var rr = f.c * T * (T - f.T0) * Math.sqrt(Math.max(0, f.TL - T));
      if (isFinite(rr)) rMax = Math.max(rMax, rr);
    }
    f.curve.forEach(function(p){ rMax = Math.max(rMax, p.r, p.rhat); tMin = Math.min(tMin, p.T); tMax = Math.max(tMax, p.T); });
    tMin = Math.min(tMin, f.T0); tMax = Math.max(tMax, f.TL);
  });
  if (!(rMax > 0)) return;
  tMin = Math.floor(tMin - 2); tMax = Math.ceil(tMax + 2);
  rMax = rMax * 1.15;
  function xAt(t){ return PADL + (t - tMin) / (tMax - tMin) * PW; }
  function yAt(r){ return PADT + (1 - r / rMax) * PH; }
  ctx.strokeStyle = '#e2e8f0'; ctx.fillStyle = '#94a3b8'; ctx.font = '10px "Segoe UI",sans-serif'; ctx.textAlign = 'right';
  for (var g = 0; g <= 4; g++){
    var rv = rMax * g / 4, y = yAt(rv);
    ctx.beginPath(); ctx.moveTo(PADL, y); ctx.lineTo(W - PADR, y); ctx.stroke();
    ctx.fillText(rv.toFixed(3), PADL - 4, y + 3);
  }
  ctx.textAlign = 'center';
  for (var gt = 0; gt <= 4; gt++){
    var tv = tMin + (tMax - tMin) * gt / 4;
    ctx.fillText(Math.round(tv) + '℃', xAt(tv), H - 8);
  }
  curves.forEach(function(c, ci){
    var col = PAL[ci % PAL.length], f = c.fit;
    var n = f.curve.length, sx = 0, sy = 0, sxx = 0, sxy = 0; // 同样本线性回归（灰虚线对比）
    f.curve.forEach(function(p){ sx += p.T; sy += p.r; sxx += p.T * p.T; sxy += p.T * p.r; });
    var den = n * sxx - sx * sx;
    if (den > 0){
      var b1 = (n * sxy - sx * sy) / den, b0 = (sy - b1 * sx) / n;
      ctx.strokeStyle = '#cbd5e1'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.3; ctx.beginPath();
      ctx.moveTo(xAt(tMin), yAt(Math.max(0, b1 * tMin + b0)));
      ctx.lineTo(xAt(tMax), yAt(Math.max(0, b1 * tMax + b0)));
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); // Brière 实线（[T₀, T_L] 内连续取值）
    var started = false;
    for (var T = f.T0; T <= f.TL + 1e-9; T += 0.2){
      var rhat = f.c * T * (T - f.T0) * Math.sqrt(Math.max(0, f.TL - T));
      if (!started){ ctx.moveTo(xAt(T), yAt(rhat)); started = true; } else ctx.lineTo(xAt(T), yAt(rhat));
    }
    ctx.stroke();
    ctx.fillStyle = col; // 样本散点
    f.curve.forEach(function(p){ ctx.beginPath(); ctx.arc(xAt(p.T), yAt(p.r), 3, 0, Math.PI * 2); ctx.fill(); });
  });
  ctx.font = '10.5px "Segoe UI","Microsoft YaHei",sans-serif'; ctx.textAlign = 'left';
  var lx = PADL;
  curves.forEach(function(c, ci){
    var label = c.name + T(' Brière 拟合', ' Brière fit');
    ctx.fillStyle = PAL[ci % PAL.length];
    ctx.fillRect(lx, 6, 12, 3);
    ctx.fillStyle = '#475569';
    ctx.fillText(label, lx + 16, 10);
    lx += ctx.measureText(label).width + 30;
  });
  ctx.fillStyle = '#cbd5e1'; ctx.fillRect(lx, 6, 12, 3);
  ctx.fillStyle = '#64748b';
  ctx.fillText(tr('线性回归（对比）'), lx + 16, 10);
}
var IOT_HELP = {
  sensor: {t:'温湿度传感器 · 接入指南', steps: [
    '<b>1. 登录米家账号：</b>在上方「米家账号」处输入手机号 / 邮箱，短信验证码登录。只需登录一次，此后自动保持连接。',
    '<b>2. 设备就绪：</b>蓝牙温湿度计（如 LYWSD03MMC）装入电池即可；Wi-Fi 型在米家 App 完成配网。电脑需有蓝牙适配器（或配一个蓝牙网关）。',
    '<b>3. 同步设备：</b>点「同步设备」，内置连接器自动发现账号下的传感器，出现在本页列表。',
    '<b>4. 绑定蚊笼：</b>在传感器卡片上「绑定蚊笼」；此后按 15–60 分钟间隔自动生成环境记录并联动 F8 预警，无需手动抄录。',
    '<b>提示：</b>蓝牙型走局域网直连、断云可用；v4/v5 加密型首次接入需在米家 App 授权，连接器会自动完成密钥导入。'
  ]},
  cam: {t:'摄像头 · 接入指南', steps: [
    '<b>1. 登录并同步：</b>登录米家账号后点「同步设备」，账号下的摄像头自动出现在本页。',
    '<b>2. 确认在线：</b>在米家 App 确认摄像头在线可看。',
    '<b>3. 绑定蚊笼：</b>在摄像头卡片「关联蚊笼」后，点「查看画面」即可在蚊笼上下文中观看实时画面，快照自动存证关联。',
    '<b>4. 关于型号选择：</b>固件带「RTSP 访问」开关的型号开启后走局域网低延迟通道；<b>无 RTSP 开关的型号暂不支持取流</b>（小米未开放个人云取流通道），选购时优先带 RTSP 开关的型号。转流服务已随安装包内置，无需自行部署 go2rtc。'
  ]},
  plug: {t:'插座开关 · 接入指南', steps: [
    '<b>1. 设备配网：</b>智能插座按米家 App 正常配网；登录账号后「同步设备」即可自动发现。',
    '<b>2. 接入用电设备：</b>将恒温加热垫、循环风扇、光周期定时器等蚊房设备接入插座，并在卡片上标注用途、关联蚊笼。',
    '<b>3. 远程控制：</b>在卡片上直接开关；操作与状态变化实时同步。',
    '<b>4. 预警联动（可选）：</b>温度持续低于下限自动开启加热垫、湿度超上限自动开启风扇等规则，可在卡片「预警联动」中开启（建议开启前人工复核）。',
    '<b>提示：</b>涉及加热类设备务必保留硬件温控保护，软件联动仅作辅助，不要作为唯一保护手段。'
  ]},
  serial: {t:'USB 串口 · 接入指南', foot:'桌面版通过自研串口命令直接访问硬件（无需浏览器权限）；浏览器预览模式请勾选「模拟读数」体验全流程。', steps: [
    '<b>1. 硬件准备：</b>USB 转 RS485 适配器一只（CH340 / FT232 等芯片，免驱即可），Modbus RTU 温湿度变送器若干（SHT 系列等，8-N-1，出厂从站地址一般为 1）。',
    '<b>2. 接线：</b>变送器 485A / 485B 对应接入适配器 A / B；多台变送器在总线上手拉手并联，各自需设置不同的从站地址（1–247）。',
    '<b>3. 连接：</b>插入适配器，点「刷新端口」选择出现的 COM 口与波特率（与变送器一致，常见 9600），在「探头列表」逐一登记各探头名称与从站地址后点「连接」。',
    '<b>4. 监测：</b>连接后每 5 秒按从站地址顺序轮询全部探头（功能码 03，从 0x0000 读 2 个：湿度、温度，0.1 倍率；RS485 半双工不可并发）；实时曲线展示最近 12 分钟各探头读数，超出阈值自动生成预警，监测读数留存 result/env_*.json（桌面版）。',
    '<b>提示：</b>不同厂家的寄存器映射可能不同（部分型号温度在前），若温湿度显示对调请查阅所用变送器说明书；「标准限值模板」可一键套用 WHO 接触测定 / WHO 瓶测定 / IAEA 伊蚊饲养温湿度限值，套用后仍可在「预警阈值」中微调。'
  ]}
};
function iotHelp(kind){
  var h = IOT_HELP[kind];
  if (!h) return;
  $('#ih-title').textContent = tr(h.t);
  $('#ih-body').innerHTML = h.steps.map(function(s){ return '<div style="font-size:12.5px;color:#334155;line-height:1.7;padding:6px 0;border-bottom:1px dashed #e2e8f0">' + tr(s) + '</div>'; }).join('') +
    '<div style="font-size:11.5px;color:#94a3b8;margin-top:8px">' + tr(h.foot || '登录与同步均在本软件内完成，无需自建 Home Assistant；技术细节详见《调研-米家设备接入可行性》（当前版本为示例界面）。') + '</div>';
  showModal('modal-iot-help');
}
var delArmed = false, delTimer = null;
function openCageEdit(){
  var b = getBatch(state.currentBatch);
  if (!b) return;
  $('#ce-id').value = b.id;
  $('#ce-gen').value = b.gen;
  $('#ce-start').value = b.start;
  $('#ce-eggs').value = b.eggs;
  showModal('modal-cage-edit');
}
function saveCageEdit(){
  var b = getBatch(state.currentBatch);
  if (!b) return;
  var nid = $('#ce-id').value.trim();
  if (!nid){ toast(tr('笼号不能为空')); return; }
  if (nid !== b.id && getBatch(nid)){ toast(T('笼号 ' + nid + ' 已存在', 'Cage ID ' + nid + ' already exists')); return; }
  b.id = nid;
  b.gen = $('#ce-gen').value.trim() || b.gen;
  b.start = $('#ce-start').value.trim() || b.start;
  b.eggs = parseInt($('#ce-eggs').value, 10) || b.eggs;
  closeModal();
  renderAll();
  toast(tr('蚊笼信息已更新'));
}
function deleteCage(){
  var btn = document.getElementById('btn-cage-del');
  if (!btn) return;
  if (!delArmed){
    delArmed = true;
    btn.textContent = tr('确认删除');
    delTimer = setTimeout(function(){ delArmed = false; btn.textContent = tr('删除'); }, 3000);
    return;
  }
  clearTimeout(delTimer);
  delArmed = false;
  var b = getBatch(state.currentBatch);
  if (!b) return;
  batches = batches.filter(function(x){ return x.id !== b.id; });
  renderAll();
  navigate('batches');
  toast(T('蚊笼 ' + b.id + ' 已删除', 'Cage ' + b.id + ' deleted'));
}

// ================= v2.0 硬件接入（本地）· 蚊活动度监测 =================
var locCams = [];        // 每路一个对象 {id, devId, label, cage, stream, video, algo, procCv, procCtx, gray, on, lastT, recOn, recT0, recBuf}
var locCamSeq = 0;
var locDevCache = [];    // enumerateDevices() 缓存（videoinput）
var locDevBind = (function(){ try { return JSON.parse(localStorage.getItem('mcLocBind') || '{}'); } catch(e){ return {}; } })();
var locRaf = 0;
function saveLocBind(){
  try { localStorage.setItem('mcLocBind', JSON.stringify(locDevBind)); } catch(e){}
}
function refreshLocDevices(){
  var sel = $('#loc-dev-sel');
  if (!sel) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices){
    sel.innerHTML = '<option value="">' + tr('当前环境不支持摄像头') + '</option>';
    return;
  }
  navigator.mediaDevices.enumerateDevices().then(function(devs){
    locDevCache = devs.filter(function(d){ return d.kind === 'videoinput'; });
    sel.innerHTML = '<option value="">' + tr('选择设备…') + '</option>' + locDevCache.map(function(d, i){
      return '<option value="' + esc(d.deviceId) + '">' + esc(d.label || (tr('摄像头') + ' ' + (i + 1))) + '</option>';
    }).join('');
  }).catch(function(){
    sel.innerHTML = '<option value="">' + tr('无法枚举摄像头设备') + '</option>';
  });
}
function addLocCam(){
  var sel = $('#loc-dev-sel');
  var devId = sel ? sel.value : '';
  if (!devId){
    /* 未授权时设备列表可能为空：先触发一次授权再刷新 */
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
      navigator.mediaDevices.getUserMedia({video:true}).then(function(s){
        s.getTracks().forEach(function(t){ t.stop(); });
        refreshLocDevices();
        toast(tr('已获得摄像头权限，请再次点「添加摄像头」'));
      }).catch(function(err){
        toast(tr('摄像头不可用：请检查系统隐私设置与浏览器授权') + '（' + err.name + '）');
      });
      return;
    }
    toast(tr('请先选择设备'));
    return;
  }
  if (locCams.some(function(c){ return c.devId === devId; })){ toast(tr('该摄像头已添加')); return; }
  navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:devId}, width:{ideal:640}, height:{ideal:480}}}).then(function(stream){
    var video = document.createElement('video');
    video.playsInline = true; video.muted = true;
    video.setAttribute('playsinline', '');
    video.srcObject = stream;
    video.play();
    locCamSeq++;
    var track = stream.getVideoTracks()[0];
    var label = (track && track.label) || (function(){
      var d = locDevCache.filter(function(x){ return x.deviceId === devId; })[0];
      return (d && d.label) || tr('摄像头');
    })();
    var cam = {
      id: 'LC-' + locCamSeq, devId: devId, label: label,
      cage: locDevBind[devId] || '',
      stream: stream, video: video,
      algo: new MosqActivity(192, 144),
      procCv: null, procCtx: null, gray: null,
      lastT: 0, recOn: false, recT0: 0, recBuf: null
    };
    locCams.push(cam);
    renderLocal();
    ensureLocLoop();
    toast(T('已接入 ' + label, 'Connected ' + label));
  }).catch(function(err){
    toast(tr('摄像头不可用：请检查系统隐私设置与浏览器授权') + '（' + err.name + '）');
  });
}
function stopLocCam(id){
  var c = locCams.filter(function(x){ return x.id === id; })[0];
  if (!c) return;
  if (c.recOn) stopRecDiscard(id);
  c.stream.getTracks().forEach(function(t){ t.stop(); });
  locCams = locCams.filter(function(x){ return x.id !== id; });
  renderLocal();
  if (!locCams.length && locRaf){ cancelAnimationFrame(locRaf); locRaf = 0; }
}
function stopAllLocCams(){
  locCams.slice().forEach(function(c){ stopLocCam(c.id); });
}
function ensureLocLoop(){
  if (!locRaf && locCams.length) locRaf = requestAnimationFrame(locLoop);
}
function locLoop(ts){
  if (!locCams.length){ locRaf = 0; return; }
  locRaf = requestAnimationFrame(locLoop);
  for (var i = 0; i < locCams.length; i++){
    var c = locCams[i];
    if (ts - c.lastT < 95) continue;   // 每路 ~10 fps
    c.lastT = ts;
    if (!c.video.videoWidth) continue;
    processLocCam(c);
  }
}
function grabCamGray(c){
  var w = 192, h = 144;
  if (!c.procCv){
    c.procCv = document.createElement('canvas');
    c.procCv.width = w; c.procCv.height = h;
    c.procCtx = c.procCv.getContext('2d', {willReadFrequently:true});
    c.gray = new Uint8Array(w * h);
  }
  c.procCtx.drawImage(c.video, 0, 0, w, h);
  var px = c.procCtx.getImageData(0, 0, w, h).data;
  for (var i = 0, j = 0; j < w * h; i += 4, j++){
    c.gray[j] = (px[i] * 77 + px[i+1] * 150 + px[i+2] * 29) >> 8;
  }
  return c.gray;
}
function drawCam(c){
  var cv = document.getElementById('loc-disp-' + c.id);
  if (!cv) return;
  var ctx = cv.getContext('2d');
  ctx.drawImage(c.video, 0, 0, cv.width, cv.height);
  if (!c.algo) return;
  var w = c.algo.w, h = c.algo.h, mask = c.algo.mask;
  var sx = cv.width / w, sy = cv.height / h;
  ctx.fillStyle = 'rgba(239,68,68,0.45)';
  for (var y = 0; y < h; y++){
    for (var x = 0; x < w; x++){
      if (mask[y * w + x] === 2) ctx.fillRect(x * sx, y * sy, sx, sy);
    }
  }
}
function processLocCam(c){
  var gray = grabCamGray(c);
  if (!gray) return;
  c.algo.processFrame(gray, c.video.currentTime);
  drawCam(c);   // v2.1 修复黑屏：显示画布逐帧绘制（含活动掩膜叠加），原版漏调用导致预览一直黑屏
  var s = c.algo.pullSecond();
  if (!s) return;
  var elA = document.getElementById('lr-ai-' + c.id), elC = document.getElementById('lr-cnt-' + c.id);
  if (elA) elA.textContent = s.aiS.toFixed(1);
  if (elC) elC.textContent = (Math.round(s.cnt * 10) / 10).toFixed(1);
  if (c.recOn){
    c.recBuf.push({t: Math.round((Date.now() - c.recT0) / 1000), ai: +s.aiS.toFixed(2), cnt: Math.round(s.cnt * 10) / 10});
    var elD = document.getElementById('lr-dur-' + c.id);
    if (elD) elD.textContent = locFmtDur((Date.now() - c.recT0) / 1000);
  }
}
/* ---------- 监测会话（按路记录） ---------- */
var actSessions = [];   // 监测会话：{id, cam, cage, note, start, dur, samples:[{t,ai,cnt}], meanAI, peakAI, meanCnt}
var actSeq = 0;
function locFmtDur(sec){
  sec = Math.max(0, Math.round(sec));
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' + s : s);
}
function locClock(ms){
  var d = new Date(ms);
  function p2(x){ return x < 10 ? '0' + x : x; }
  return p2(d.getHours()) + ':' + p2(d.getMinutes());
}
function fillLocCageSelFor(sel){
  if (!sel) return;
  var cur = sel.value;
  var rearing = batches.filter(function(b){ return b.status === 'rearing'; });
  sel.innerHTML = '<option value="">' + tr('未绑定') + '</option>' + rearing.map(function(b){
    return '<option value="' + b.id + '">' + b.id + ' · ' + tr(strains[b.strain].name) + '</option>';
  }).join('');
  if (rearing.some(function(b){ return b.id === cur; })) sel.value = cur;
}
function bindLocCam(id, cage){
  var c = locCams.filter(function(x){ return x.id === id; })[0];
  if (!c) return;
  c.cage = cage;
  locDevBind[c.devId] = cage;
  saveLocBind();
}
/* ---------- 视频录制留存（v2.1：MediaRecorder 同步录制，停止记录后自动下载） ---------- */
function pickRecMime(){
  var list = ['video/webm;codecs=vp8', 'video/webm;codecs=h264', 'video/webm', 'video/mp4'];
  for (var i = 0; i < list.length; i++){ try { if (MediaRecorder.isTypeSupported(list[i])) return list[i]; } catch(e){} }
  return '';
}
function startCamVideo(c){
  c.mr = null; c.vchunks = null;
  if (!window.MediaRecorder || !c.stream){ toast(T('当前环境不支持视频录制，仅保存活动度采样数据', 'Video recording not supported here; only activity samples will be saved')); return; }
  try {
    var mime = pickRecMime();
    c.mr = mime ? new MediaRecorder(c.stream, {mimeType: mime}) : new MediaRecorder(c.stream);
    c.vchunks = [];
    c.mr.ondataavailable = function(e){ if (e.data && e.data.size) c.vchunks.push(e.data); };
    c.mr.start(1000);
  } catch(e){
    c.mr = null; c.vchunks = null;
    toast(T('视频录制启动失败，仅保存活动度采样数据', 'Failed to start video recording; only activity samples will be saved') + '（' + e.name + '）');
  }
}
function stopCamVideo(c, keep){
  return new Promise(function(res){
    var mr = c.mr;
    if (!mr){ res(null); return; }
    c.mr = null;
    var chunks = c.vchunks; c.vchunks = null;
    function done(){
      res(keep && chunks && chunks.length ? new Blob(chunks, {type: mr.mimeType || 'video/webm'}) : null);
    }
    if (mr.state === 'inactive'){ done(); return; }
    mr.onstop = done;
    try { mr.stop(); } catch(e){ done(); }
  });
}
function saveRecVideo(c, sess, blob){
  if (!blob) return;
  var ext = blob.type.indexOf('mp4') >= 0 ? 'mp4' : 'webm';
  var ts = new Date();
  function p2(x){ return x < 10 ? '0' + x : x; }
  var name = 'MosqRec_' + (c.cage || 'NoCage') + '_' + ts.getFullYear() + p2(ts.getMonth() + 1) + p2(ts.getDate()) + '-' + p2(ts.getHours()) + p2(ts.getMinutes()) + p2(ts.getSeconds()) + '.' + ext;
  sess.video = {name: name, size: blob.size, mime: blob.type};
  if (MC_DISK){
    // v2.2：桌面版视频实时留存到 result/videos/，关闭软件也不丢失
    blob.arrayBuffer().then(function(buf){
      var bytes = new Uint8Array(buf);
      var CH = 512 * 1024, i = 0;
      function next(){
        if (i >= bytes.length){
          toast(T('视频已留存：result\\videos\\' + name, 'Video saved: result/videos/' + name));
          return;
        }
        var end = Math.min(i + CH, bytes.length);
        var part = Array.prototype.slice.call(bytes.subarray(i, end));
        i = end;
        mcInvoke('mc_append', {rel: 'result/videos/' + name, bytes: part}).then(next).catch(function(){
          toast(T('视频写入本地失败（会话数据仍已保存）', 'Failed to write video to disk (session data still saved)'));
        });
      }
      next();
    }).catch(function(){});
    return;
  }
  try {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
  } catch(e){}
}
function toggleRec(camId){
  var c = locCams.filter(function(x){ return x.id === camId; })[0];
  if (!c){ toast(tr('请先启动摄像头')); return; }
  if (c.recOn){ finishRec(camId); return; }
  if (!c.cage){ toast(tr('请先为该摄像头绑定蚊笼')); return; }
  c.recOn = true;
  c.recT0 = Date.now();
  c.recBuf = [];
  startCamVideo(c);   // v2.1：记录期间同步录制摄像头画面
  renderLocal();
}
function stopRecDiscard(camId){
  var c = locCams.filter(function(x){ return x.id === camId; })[0];
  if (!c) return;
  c.recOn = false; c.recBuf = null;
  stopCamVideo(c, false);   // v2.1：中止时丢弃视频
  var elD = document.getElementById('lr-dur-' + camId);
  if (elD) elD.textContent = '–';
}
function finishRec(camId){
  var c = locCams.filter(function(x){ return x.id === camId; })[0];
  if (!c) return;
  var buf = c.recBuf, recT0 = c.recT0;
  var note = ($('#loc-note') ? $('#loc-note').value.trim() : '');
  c.recOn = false; c.recBuf = null;
  var elD = document.getElementById('lr-dur-' + camId);
  if (elD) elD.textContent = '–';
  if (!buf || buf.length < 3){
    stopCamVideo(c, false);
    toast(tr('记录过短，已丢弃（至少 3 秒采样）'));
    return;
  }
  stopCamVideo(c, true).then(function(blob){
    var mean = function(a){ return a.reduce(function(s, v){ return s + v; }, 0) / a.length; };
    var ais = buf.map(function(s){ return s.ai; });
    actSeq++;
    var sess = {
      id: 'ACT-' + (actSeq < 10 ? '0' + actSeq : actSeq),
      cam: c.label,
      cage: c.cage,
      note: note,
      start: locClock(recT0),
      dur: Math.round((Date.now() - recT0) / 1000),
      samples: buf,
      meanAI: mean(ais),
      peakAI: Math.max.apply(null, ais),
      meanCnt: mean(buf.map(function(s){ return s.cnt; }))
    };
    if (blob) saveRecVideo(c, sess, blob);
    actSessions.unshift(sess);
    renderLocal();
    renderActAnalysis();
    toast(T('监测会话 ' + sess.id + ' 已保存（' + sess.samples.length + ' 秒采样' + (sess.video ? '，视频已留存' : '') + '）', 'Session ' + sess.id + ' saved (' + sess.samples.length + ' s samples' + (sess.video ? ', video saved' : '') + ')'));
    if (sess.video) toast(T('视频已留存：' + sess.video.name, 'Video saved: ' + sess.video.name));
  });
}
function actTableHtml(){
  var h = '<div class="tbl-wrap"><table class="tbl"><thead><tr>' +
    ['会话', '摄像头', '笼号', '开始时间', '时长', '平均AI', '峰值AI', '平均虫数', '视频', '备注', '操作'].map(function(x){ return '<th>' + tr(x) + '</th>'; }).join('') +
    '</tr></thead><tbody>';
  actSessions.forEach(function(s){
    h += '<tr><td><b>' + s.id + '</b></td><td class="wrap">' + esc(s.cam || '—') + '</td><td>' + s.cage + '</td><td>' + s.start + '</td><td>' + locFmtDur(s.dur) + '</td>' +
      '<td>' + fmt1(s.meanAI) + '</td><td>' + fmt1(s.peakAI) + '</td><td>' + fmt1(s.meanCnt) + '</td>' +
      '<td>' + (s.video ? '<span title="' + esc(s.video.name) + '">✓ ' + Math.max(1, Math.round(s.video.size / 1024)) + 'KB</span>' : '—') + '</td>' +
      '<td class="wrap">' + (s.note ? esc(s.note) : tr('— 无 —')) + '</td>' +
      '<td><button class="mini-btn ghost" onclick="viewActSession(\'' + s.id + '\')">' + tr('查看') + '</button> ' +
      '<button class="mini-btn ghost" onclick="exportActSession(\'' + s.id + '\')">' + tr('导出') + '</button> ' +
      '<button class="mini-btn danger" onclick="deleteActSession(\'' + s.id + '\')">' + tr('删除') + '</button></td></tr>';
  });
  return h + '</tbody></table></div>';
}
var ACT_EMPTY = function(){ return '<div class="empty">' + tr('暂无监测会话：启动摄像头并点「开始记录」后，将在此列出监测会话。') + '</div>'; };
function locCamCardHtml(c){
  var rec = c.recOn;
  return '<div class="loc-cam-card" id="lcc-' + c.id + '">' +
    '<div class="region-title" style="margin-bottom:8px">' +
    '<b style="font-size:13px;color:#0f172a">' + esc(c.label) + '</b>' +
    (rec
      ? '<span class="tag" style="background:#fef2f2;color:#b91c1c"><span class="rec-dot"></span>' + tr('记录中') + '</span>'
      : '<span class="tag" style="background:#f0fdf4;color:#166534">' + tr('运行中') + '</span>') +
    '<button class="mini-btn ghost" style="margin-left:auto" onclick="stopLocCam(\'' + c.id + '\')">' + tr('停止') + '</button></div>' +
    '<canvas id="loc-disp-' + c.id + '" width="384" height="288"></canvas>' +
    '<div class="filters" style="margin:8px 0 0">' +
    '<span>' + tr('绑定蚊笼') + '</span>' +
    '<select data-cam="' + c.id + '" onchange="bindLocCam(\'' + c.id + '\', this.value)" style="font-size:12.5px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;max-width:180px"></select>' +
    '<button class="mini-btn ' + (rec ? 'danger' : '') + '" onclick="toggleRec(\'' + c.id + '\')">' + (rec ? tr('停止并保存') : tr('开始记录')) + '</button></div>' +
    '<div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-top:8px">' +
    '<div class="kpi"><div class="kv" id="lr-ai-' + c.id + '" style="font-size:18px">–</div><div class="kl">' + tr('活跃度指数（AI）') + '</div></div>' +
    '<div class="kpi"><div class="kv" id="lr-cnt-' + c.id + '" style="font-size:18px">–</div><div class="kl">' + tr('活动虫数（估计）') + '</div></div>' +
    '<div class="kpi"><div class="kv" id="lr-dur-' + c.id + '" style="font-size:18px">' + (rec ? locFmtDur((Date.now() - c.recT0) / 1000) : '–') + '</div><div class="kl">' + tr('监测时长') + '</div></div>' +
    '</div></div>';
}
function renderLocal(){ MCStore.save();
  var grid = $('#loc-cam-grid');
  if (grid){
    grid.innerHTML = locCams.length ? locCams.map(locCamCardHtml).join('')
      : '<div class="empty" style="grid-column:1/-1">' + tr('暂未添加摄像头：从上方选择设备并点「添加摄像头」。') + '</div>';
    grid.querySelectorAll('select[data-cam]').forEach(function(s){
      fillLocCageSelFor(s);
      var c = locCams.filter(function(x){ return x.id === s.dataset.cam; })[0];
      if (c && c.cage) s.value = c.cage;
    });
  }
  $('#loc-sessions').innerHTML = actSessions.length ? actTableHtml() : ACT_EMPTY();
}
function viewActSession(id){
  navigate('analytics');
  switchAnaTab('act');
  var sel = $('#act-sel');
  if (actSessions.some(function(s){ return s.id === id; }) && sel){
    sel.value = id;
    renderActChart();
  }
}
function exportActSession(id){
  var s = actSessions.filter(function(x){ return x.id === id; })[0];
  if (!s) return;
  var rows = [['会话', '笼号', '开始时间', '时长(s)', '备注'],
    [s.id, s.cage, s.start, s.dur, s.note || ''],
    [],
    ['时间(s)', '活跃度指数 AI', '活动虫数（估计）']];
  s.samples.forEach(function(p){ rows.push([p.t, p.ai, p.cnt]); });
  downloadCsv('MosqCare_' + s.id + '_' + s.cage + '.csv', rows);
  toast(T('已导出 ' + s.id + ' 监测会话 CSV（' + s.samples.length + ' 秒采样）', 'Session ' + s.id + ' CSV exported (' + s.samples.length + ' s samples)'));
}
function deleteActSession(id){
  if (!actSessions.some(function(x){ return x.id === id; })) return;
  actSessions = actSessions.filter(function(x){ return x.id !== id; });
  renderLocal();
  renderActAnalysis();
  toast(T('监测会话 ' + id + ' 已删除', 'Session ' + id + ' deleted'));
}
function switchIotTab(name){
  document.querySelectorAll('#iot-ptabs button').forEach(function(b){ b.classList.toggle('active', b.dataset.ptab === name); });
  document.getElementById('iotp-local').classList.toggle('active', name === 'local');
  document.getElementById('iotp-mijia').classList.toggle('active', name === 'mijia');
  document.getElementById('iotp-serial').classList.toggle('active', name === 'serial');
  if (name === 'serial'){ refreshSerialPorts(); renderSerial(); }
}
function switchAnaTab(name){
  document.querySelectorAll('#ana-ptabs button').forEach(function(b){ b.classList.toggle('active', b.dataset.ptab === name); });
  document.getElementById('anap-surv').classList.toggle('active', name === 'surv');
  document.getElementById('anap-act').classList.toggle('active', name === 'act');
  document.getElementById('anap-env').classList.toggle('active', name === 'env');
  if (name === 'act') renderActAnalysis();
  if (name === 'env') renderEnvAnalysis();
}

/* ---------- 统计分析 · 活动分析页签 ---------- */
function drawSeriesLine(cv, def){
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  var data = def.data || [];
  if (data.length < 2) return;
  var padL = 46, padR = 14, padT = 14, padB = 24;
  var iw = W - padL - padR, ih = H - padT - padB;
  var yMax = def.yMax;
  if (yMax == null){
    yMax = Math.max.apply(null, data.map(function(p){ return p.y; }));
    yMax = yMax <= 0 ? 1 : yMax * 1.15;
  }
  function px(i){ return padL + i / (data.length - 1) * iw; }
  function py(v){ return padT + ih - Math.max(0, Math.min(1, v / yMax)) * ih; }
  ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 1;
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
  var steps = 4, g, y;
  for (g = 0; g <= steps; g++){
    var v = yMax * g / steps;
    y = py(v);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillText(v >= 10 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1), padL - 6, y + 3);
  }
  ctx.textAlign = 'center';
  var tickEvery = Math.max(1, Math.ceil(data.length / 8));
  for (var i = 0; i < data.length; i += tickEvery){
    ctx.fillText(String(data[i].x), px(i), H - 8);
  }
  ctx.strokeStyle = def.color || '#2563eb';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (var j = 0; j < data.length; j++){
    if (j === 0) ctx.moveTo(px(j), py(data[j].y));
    else ctx.lineTo(px(j), py(data[j].y));
  }
  ctx.stroke();
  if (def.yLabel){
    ctx.save();
    ctx.translate(11, padT + ih / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.font = '11px sans-serif';
    ctx.fillText(def.yLabel, 0, 0);
    ctx.restore();
  }
}
function renderActAnalysis(){ MCStore.save();
  var n = actSessions.length;
  var totDur = actSessions.reduce(function(s, x){ return s + x.dur; }, 0);
  var meanAI = n ? actSessions.reduce(function(s, x){ return s + x.meanAI; }, 0) / n : 0;
  var peakAI = n ? Math.max.apply(null, actSessions.map(function(x){ return x.peakAI; })) : 0;
  $('#act-kpis').innerHTML =
    '<div class="kpi"><div class="kv">' + n + '</div><div class="kl">' + tr('监测会话') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + locFmtDur(totDur) + '</div><div class="kl">' + tr('累计监测时长') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + (n ? fmt1(meanAI) : '–') + '</div><div class="kl">' + tr('平均活跃度 AI') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + (n ? fmt1(peakAI) : '–') + '</div><div class="kl">' + tr('峰值活跃度 AI') + '</div></div>';
  var sel = $('#act-sel');
  var cur = sel.value;
  sel.innerHTML = actSessions.map(function(s){
    return '<option value="' + s.id + '">' + s.id + ' · ' + (s.cam ? esc(s.cam) + ' · ' : '') + s.cage + (s.note ? ' · ' + esc(s.note) : '') + '</option>';
  }).join('');
  if (actSessions.some(function(s){ return s.id === cur; })) sel.value = cur;
  $('#act-table').innerHTML = n ? actTableHtml() : ACT_EMPTY();
  renderActChart();
  drawCircadian();
}
function renderActChart(){
  var id = $('#act-sel').value;
  var s = actSessions.filter(function(x){ return x.id === id; })[0];
  var cv1 = document.getElementById('act-ch1'), cv2 = document.getElementById('act-ch2');
  if (!s){
    cv1.getContext('2d').clearRect(0, 0, cv1.width, cv1.height);
    cv2.getContext('2d').clearRect(0, 0, cv2.width, cv2.height);
    $('#act-detail').innerHTML = '';
    return;
  }
  drawSeriesLine(cv1, {data: s.samples.map(function(p){ return {x: p.t, y: p.ai}; }), color: '#2563eb', yLabel: tr('活跃度指数 AI')});
  drawSeriesLine(cv2, {data: s.samples.map(function(p){ return {x: p.t, y: p.cnt}; }), color: '#0ea5e9', yLabel: tr('活动虫数')});
  $('#act-detail').innerHTML =
    '<div class="sub-region" style="font-size:12.5px;color:#475569;line-height:1.8">' +
    '<b>' + s.id + '</b> · ' + tr('摄像头') + ' ' + esc(s.cam || '—') + ' · ' + tr('笼号') + ' ' + s.cage +
    (s.note ? ' · ' + tr('备注') + '：' + esc(s.note) : '') + '<br>' +
    tr('时长') + ' ' + locFmtDur(s.dur) + ' · ' + tr('平均AI') + ' ' + fmt1(s.meanAI) + ' · ' + tr('峰值AI') + ' ' + fmt1(s.peakAI) + ' · ' + tr('平均虫数') + ' ' + fmt1(s.meanCnt) +
    '<div style="margin-top:6px"><button class="mini-btn ghost" onclick="exportActSession(\'' + s.id + '\')">' + tr('导出') + ' CSV</button></div></div>';
}

/* ---------- 统计分析 · 科研分析套件（v3.2 · MosqResearch） ---------- */
var sciPalette = ['#2563eb', '#0ea5e9', '#16a34a', '#d97706', '#7c3aed', '#dc2626'];
function drawCircadian(){
  var cv = document.getElementById('act-circadian');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  var note = $('#act-cir-note');
  if (!actSessions.length){
    ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(tr('暂无监测会话：在「硬件接入 → 本地接入」记录监测会话后，此处将自动生成昼夜节律图。'), W / 2, H / 2);
    if (note) note.textContent = '';
    return;
  }
  var prof = MosqResearch.circadian(actSessions);
  var padL = 46, padR = 14, padT = 14, padB = 24;
  var iw = W - padL - padR, ih = H - padT - padB;
  var yMax = Math.max.apply(null, prof.hourMean.map(function(v){ return v === null ? 0 : v; }));
  if (yMax <= 0) yMax = 1; else yMax *= 1.15;
  var bw = iw / 24;
  ctx.fillStyle = '#94a3b8'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right';
  for (var g = 0; g <= 4; g++){
    var v = yMax * g / 4;
    var y = padT + ih - v / yMax * ih;
    ctx.strokeStyle = '#eef2f6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    ctx.fillText((Math.round(v * 10) / 10).toFixed(1), padL - 6, y + 3);
  }
  for (var h = 0; h < 24; h++){
    if (prof.hourMean[h] === null) continue;
    var light = h >= 6 && h < 20;
    var bh = Math.max(prof.hourMean[h] / yMax * ih, 2);
    ctx.fillStyle = light ? '#f59e0b' : '#475569';
    ctx.globalAlpha = light ? 0.9 : 0.85;
    ctx.fillRect(padL + h * bw + 1.5, padT + ih - bh, bw - 3, bh);
    ctx.globalAlpha = 1;
    if (h === prof.peakHour){
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(padL + h * bw + bw / 2 - 1, padT + ih - bh - 8, 2, 8);
    }
  }
  ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
  for (var x = 0; x < 24; x += 2){ ctx.fillText(String(x), padL + x * bw + bw / 2, H - 8); }
  if (note){
    var ph = prof.peakHour >= 0 ? prof.peakHour + ':00–' + ((prof.peakHour + 1) % 24) + ':00' : '—';
    note.innerHTML = T(
      '峰值时段 <b>' + ph + '</b> · 总体活跃度指数均值 ' + fmt1(prof.overall) +
      (prof.lightMean !== null && prof.darkMean !== null ? ' · 光相均值（06–20）' + fmt1(prof.lightMean) + ' / 暗相均值（20–06）' + fmt1(prof.darkMean) : '') +
      ' · 基于 ' + prof.nSessions + ' 个会话、' + prof.nSamples + ' 秒采样；橙色为光相、深灰为暗相（按默认光周期 14L:10D、06:00 起光相假设划分）。',
      'Peak hour <b>' + ph + '</b> · overall mean AI ' + fmt1(prof.overall) +
      (prof.lightMean !== null && prof.darkMean !== null ? ' · light-phase mean (06–20) ' + fmt1(prof.lightMean) + ' / dark-phase mean (20–06) ' + fmt1(prof.darkMean) : '') +
      ' · based on ' + prof.nSessions + ' sessions, ' + prof.nSamples + ' s of samples; amber = light phase, grey = dark phase (assumed 14L:10D starting 06:00).');
  }
}
function renderResearch(){ MCStore.save();
  renderResearchForecast();
  renderBriere();
  var kmBox = $('#sci-km'), lifeBox = $('#sci-life');
  if (!kmBox) return;
  var closed = anaClosed();
  if (!closed.length){
    kmBox.innerHTML = '<div class="empty">' + tr('暂无已结束蚊笼：蚊笼结束归档后，此处将自动生成 KM 生存曲线与生命表。') + '</div>';
    lifeBox.innerHTML = ''; return;
  }
  // 按品系池化 KM 生存曲线（生命表法，结笼按删失处理）
  var groups = [];
  closed.forEach(function(b){
    var g = null;
    for (var i = 0; i < groups.length; i++){ if (groups[i].strain === b.strain){ g = groups[i]; break; } }
    if (!g){ g = {strain: b.strain, cages: []}; groups.push(g); }
    g.cages.push(b);
  });
  groups.forEach(function(g){ g.km = MosqResearch.pooledKM(g.cages); });
  groups.sort(function(a, b){ return a.strain < b.strain ? -1 : 1; });
  var maxDay = 1;
  groups.forEach(function(g){
    g.km.steps.forEach(function(s){ if (s.day > maxDay) maxDay = s.day; });
    g.km.series.forEach(function(sr){ if (sr.censorDay !== null && sr.censorDay > maxDay) maxDay = sr.censorDay; });
  });
  maxDay += 1;
  var W = 760, H = 300, x0 = 52, y0 = H - 44, x1 = W - 20, y1 = 22;
  function px(d){ return x0 + Math.min(1, d / maxDay) * (x1 - x0); }
  function py(v){ return y0 - v / 100 * (y0 - y1); }
  var svg = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="KM 生存曲线" style="max-width:100%">';
  svg += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" stroke="#cbd5e1"/><line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" stroke="#cbd5e1"/>';
  for (var gy = 0; gy <= 100; gy += 25){
    svg += '<line x1="' + x0 + '" y1="' + py(gy) + '" x2="' + x1 + '" y2="' + py(gy) + '" stroke="#eef2f6"/>' +
      '<text x="' + (x0 - 8) + '" y="' + (py(gy) + 3) + '" font-size="10" fill="#94a3b8" text-anchor="end">' + gy + '%</text>';
  }
  var tickStep = Math.max(1, Math.ceil(maxDay / 30));
  for (var gd = 0; gd <= maxDay; gd += tickStep){
    svg += '<text x="' + px(gd) + '" y="' + (y0 + 16) + '" font-size="10" fill="#94a3b8" text-anchor="middle">' + gd + '</text>';
  }
  svg += '<text x="' + ((x0 + x1) / 2) + '" y="' + (H - 6) + '" font-size="11" fill="#64748b" text-anchor="middle">' + tr('入笼后天数') + '</text>';
  svg += '<text x="14" y="' + ((y0 + y1) / 2) + '" font-size="11" fill="#64748b" text-anchor="middle" transform="rotate(-90 14 ' + ((y0 + y1) / 2) + ')">' + tr('存活比例（%）') + '</text>';
  groups.forEach(function(g, gi){
    var c = sciPalette[gi % sciPalette.length];
    var path = 'M ' + px(0) + ' ' + py(100);
    g.km.steps.forEach(function(s){ path += ' H ' + px(s.day).toFixed(1) + ' V ' + py(s.surv * 100).toFixed(1); });
    svg += '<path d="' + path + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="' + px(g.km.steps.length ? g.km.steps[g.km.steps.length - 1].day : 0).toFixed(1) + '" cy="' + py(g.km.steps.length ? g.km.steps[g.km.steps.length - 1].surv * 100 : 100).toFixed(1) + '" r="4" fill="' + c + '"/>';
  });
  svg += '</svg>';
  var legend = '<div class="legend-row">' + groups.map(function(g, gi){
    return '<span><span class="lg-dot" style="background:' + sciPalette[gi % sciPalette.length] + '"></span>' + tr(strains[g.strain].name) + '（' + g.km.n + ' 笼）</span>';
  }).join('') + '</div>';
  var lr = '';
  if (groups.length >= 2){
    var res = MosqResearch.logRank(groups[0].km, groups[1].km);
    if (isFinite(res.chi2)){
      lr = '<div class="ana-note" style="margin-top:8px"><b>' + tr('log-rank 检验') + '（' + tr(strains[groups[0].strain].name) + ' vs ' + tr(strains[groups[1].strain].name) + '）：</b>' +
        'χ² = ' + (Math.round(res.chi2 * 100) / 100) + '，p ' + MosqResearch.fmtP(res.p) +
        T('（df = 1）→ ' + (res.p < 0.05 ? '两组生存曲线差异显著（α = 0.05）' : '两组生存曲线差异不显著（α = 0.05）'),
          '(df = 1) → ' + (res.p < 0.05 ? 'survival curves differ significantly (α = 0.05)' : 'no significant difference between survival curves (α = 0.05)')) + '</div>';
    }
  }
  kmBox.innerHTML =
    '<div class="chart-block"><div class="chart-title">' + tr('KM 生存曲线（按品系池化 · 已结束蚊笼）') + '</div>' + legend + svg +
    '<div class="ana-note">' + tr('生命表法（离散 Kaplan–Meier）：以阶段计数记录中的死亡数为事件、结笼日剩余个体按删失处理；曲线从入笼日 100% 起。样本量少时请谨慎解读。') + '</div>' + lr + '</div>';
  // 阶段生命表 + 表观净繁殖率 / 内禀增长率近似
  var LT = MosqResearch.stageLifeTable(closed);
  var tbl = '<div class="region"><div class="region-title">' + tr('阶段生命表（l_x / d_x / 100q_x · 池化）') + '</div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + tr('阶段 x') + '</th><th>' + tr('l_x（进入数）') + '</th><th>' + tr('d_x（死亡数）') + '</th><th>' + tr('100q_x（阶段死亡率 %）') + '</th></tr></thead><tbody>';
  LT.rows.forEach(function(r){
    tbl += '<tr><td>' + tr(r.stage) + '</td><td>' + r.lx + '</td><td>' + r.dx + '</td><td class="surv">' + (isFinite(r.qx) ? fmt1(r.qx) + '%' : '—') + '</td></tr>';
  });
  tbl += '</tbody></table></div>' +
    '<div class="kpis" style="grid-template-columns:repeat(5,1fr);margin-top:12px">' +
    '<div class="kpi"><div class="kv">' + (isFinite(LT.R0) ? fmt1(LT.R0) : '—') + '</div><div class="kl">' + tr('表观净繁殖率 R₀') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + (isFinite(LT.T) ? fmt1(LT.T) : '—') + '</div><div class="kl">' + tr('世代均时 T（天）') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + (isFinite(LT.rm) ? fmt1(LT.rm) : '—') + '</div><div class="kl">' + tr('内禀增长率 rₘ（近似）') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + (isFinite(LT.lam) ? fmt1(LT.lam) : '—') + '</div><div class="kl">' + tr('周限增长率 λ') + '</div></div>' +
    '<div class="kpi"><div class="kv">' + (isFinite(LT.dt) ? fmt1(LT.dt) : '—') + '</div><div class="kl">' + tr('倍增时间 DT（天）') + '</div></div></div>' +
    '<div class="ana-note">' + tr('l_x 为各阶段转入合计（自阶段计数记录汇总，「记录从略」的中间阶段不参与计算）；d_x 与 100q_x 由相邻阶段推算。R₀ = 终末成虫合计 ÷ 起始卵合计（表观净繁殖率，未计子代增殖）；T = 卵至成虫期转入的平均天数（n 个到达成虫期的蚊笼）；rₘ ≈ ln R₀ / T 为近似估算，精确计算需每雌逐日产卵量（lₓmₓ）数据；λ = e^rₘ；DT = ln2 / rₘ（仅 rₘ > 0 时有意义）。结果供品系间相对比较。') + '</div></div>';
  lifeBox.innerHTML = tbl;
}

/* ---------- 统计分析 · 环境分析页签 ---------- */
function renderEnvAnalysis(){ MCStore.save();
  var box = $('#env-charts');
  if (!box) return;
  var envByCage = [];
  batches.forEach(function(b){
    var recs = b.records.filter(function(r){ return r.t === 'env' && typeof r.temp === 'number'; });
    if (!recs.length) return;
    var hRecs = recs.filter(function(r){ return typeof r.hum === 'number'; });
    envByCage.push({
      b: b, n: recs.length,
      mt: recs.reduce(function(s, r){ return s + r.temp; }, 0) / recs.length,
      mh: hRecs.length ? hRecs.reduce(function(s, r){ return s + r.hum; }, 0) / hRecs.length : NaN
    });
  });
  if (!envByCage.length){
    box.innerHTML = '<div class="empty" style="margin-top:12px">' + tr('暂无环境记录：录入环境记录或接入米家温湿度传感器后，此处将自动生成环境分析。') + '</div>';
    return;
  }
  // ① 各蚊笼温度带（均值，按阈值着色）
  var lo = thresholds.tempLow, hi = thresholds.tempHigh;
  var html = '<div class="region" style="margin-top:12px"><div class="region-title">' + tr('各蚊笼温度带（环境记录均值）') + '</div>';
  envByCage.forEach(function(e){
    var col = e.mt < lo ? '#3b82f6' : (e.mt > hi ? '#dc2626' : '#16a34a');
    var left = Math.max(0, Math.min(96, (e.mt - 16) / 20 * 100));
    html += '<div class="bar-row"><div class="bar-lbl">' + e.b.id + ' · ' + T(e.n + ' 条记录', e.n + ' records') + '</div>' +
      '<div style="flex:1;min-width:0"><div class="env-band"><i style="left:' + left + '%;width:3%;background:' + col + '"></i></div>' +
      '<div style="font-size:10.5px;color:#94a3b8;display:flex;justify-content:space-between"><span>16℃</span><span>' + lo + '–' + hi + '℃ ' + tr('阈值') + '</span><span>36℃</span></div></div>' +
      '<div class="bar-val">' + fmt1(e.mt) + '℃ / ' + (isFinite(e.mh) ? Math.round(e.mh) + '%' : '—') + '</div></div>';
  });
  html += '<div class="ana-note">' + tr('环境记录可来自手动录入或「米家 IoT」温湿度传感器自动采集。') + '</div></div>';
  // ② 温度区间与累积存活率（已结束蚊笼）
  var closedEnv = envByCage.filter(function(e){ return e.b.status !== 'rearing'; });
  if (closedEnv.length){
    var bins = {};
    closedEnv.forEach(function(e){
      var k = Math.max(16, Math.min(34, Math.floor(e.mt / 2) * 2));
      (bins[k] = bins[k] || []).push(e);
    });
    html += '<div class="region"><div class="region-title">' + tr('温度区间与累积存活率（已结束蚊笼）') + '</div>';
    Object.keys(bins).sort(function(a, b){ return a - b; }).forEach(function(k){
      var arr = bins[k];
      var surv = arr.reduce(function(s, e){ return s + survPct(e.b); }, 0) / arr.length;
      html += '<div class="bar-row"><div class="bar-lbl">' + k + '–' + (+k + 2) + '℃ · ' + T(arr.length + ' 笼', arr.length + ' cages') + '（' + arr.map(function(e){ return e.b.id; }).join(', ') + '）</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(surv, 2) + '%;background:#2563eb;opacity:.85"></div></div>' +
        '<div class="bar-val">' + fmt1(surv) + '%</div></div>';
    });
    html += '<div class="ana-note">' + tr('仅呈现相关性，不构成因果结论；样本较少时请谨慎解读。') + '</div></div>';
  }
  // ③ 湿度分布（全部环境记录）
  var humBuckets = [['<60%', 0], ['60–70%', 0], ['70–85%', 0], ['≥85%', 0]];
  batches.forEach(function(b){
    b.records.forEach(function(r){
      if (r.t !== 'env' || typeof r.hum !== 'number') return;
      if (r.hum < 60) humBuckets[0][1]++;
      else if (r.hum < 70) humBuckets[1][1]++;
      else if (r.hum < 85) humBuckets[2][1]++;
      else humBuckets[3][1]++;
    });
  });
  var maxHum = Math.max.apply(null, humBuckets.map(function(x){ return x[1]; }));
  if (maxHum){
    html += '<div class="region"><div class="region-title">' + tr('湿度分布（环境记录）') + '</div>';
    humBuckets.forEach(function(x){
      html += '<div class="bar-row"><div class="bar-lbl">' + x[0] + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + Math.max(x[1] / maxHum * 100, 2) + '%;background:#0ea5e9;opacity:.85"></div></div>' +
        '<div class="bar-val">' + T(x[1] + ' 条', x[1] + ' rec.') + '</div></div>';
    });
    html += '</div>';
  }
  box.innerHTML = html;
}

// ================= 数据导出 / 单页报告 / 设置 =================
function downloadCsv(filename, rows){
  var txt = '\ufeff' + rows.map(function(r){
    return r.map(function(v){ return (v === undefined || v === null) ? '' : String(v); }).join(',');
  }).join('\r\n');
  if (MC_DISK){
    // v2.2：桌面版导出文件同步留存到 result/exports/
    mcInvoke('mc_write', {rel: 'result/exports/' + filename, content: txt}).then(function(){
      setTimeout(function(){ toast(T('已导出并留存：result\\exports\\' + filename, 'Exported and saved: result/exports/' + filename)); }, 2600);
    }).catch(function(){ /* 写盘失败时静默，仍走浏览器下载 */ });
    return;
  }
  var blob = new Blob([txt], {type:'text/csv;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 200);
}
function exportCsv(k){
  if (k === 'strains'){
    var rows = [['蚊株','名称','物种编码','拉丁名','来源','备注','蚊株缩写','关联蚊笼','代际分布']];
    Object.keys(strains).forEach(function(key){
      var s = strains[key];
      var mine = batches.filter(function(b){ return b.strain === key; });
      var gens = {};
      mine.forEach(function(b){ gens[b.gen] = (gens[b.gen] || 0) + 1; });
      rows.push([key, s.name, s.code, s.latin, s.source, s.note, s.abbr || '',
        mine.map(function(b){ return b.id; }).join(';'),
        Object.keys(gens).sort().map(function(g){ return g + '×' + gens[g]; }).join(';')]);
    });
    downloadCsv('MosqCare_品系档案.csv', rows);
    toast(T('已导出品系档案 CSV（' + (rows.length - 1) + ' 条，含关联蚊笼与代际分布）', 'Strain CSV exported (' + (rows.length - 1) + ' rows, with linked cages and generation summary)'));
    return;
  }
  if (k === 'strain-lineage'){
    var rows = [['蚊株','蚊株名称','世代','笼号','亲代笼','亲代蚊株','起始日期','起始卵量','当前阶段','当前数量','存活率%','状态','结束日期','终末数量','结笼原因']];
    batches.slice().sort(function(a, b){
      return a.strain === b.strain ? (a.gen === b.gen ? (a.id < b.id ? -1 : 1) : (parseInt(a.gen.slice(1), 10) - parseInt(b.gen.slice(1), 10))) : (a.strain < b.strain ? -1 : 1);
    }).forEach(function(b){
      var s = strains[b.strain] || {};
      var pb = b.parent ? getBatch(b.parent) : null;
      rows.push([b.strain, s.name || '', b.gen, b.id, b.parent || '', pb ? (strains[pb.strain] ? strains[pb.strain].name : pb.strain) : '',
        b.start, b.eggs,
        b.status === 'rearing' ? b.stage : (b.result ? b.result.stage : b.stage),
        curCount(b), fmt1(survPct(b)),
        b.status === 'rearing' ? '饲养中' : '已结束',
        b.result ? b.result.closeDate : '', b.result ? b.result.finalCount : '', b.result ? b.result.reason : '']);
    });
    downloadCsv('MosqCare_品系代际关系.csv', rows);
    toast(T('已导出品系代际关系 CSV（' + (rows.length - 1) + ' 笼，含亲代链与关联蚊笼）', 'Lineage CSV exported (' + (rows.length - 1) + ' cages, with parent links and linked cages)'));
    return;
  }
  if (k === 'cages'){
    var rows = [['笼号','蚊株','世代','亲代笼','起始日期','起始卵量','当前阶段','数量']];
    batches.forEach(function(b){
      rows.push([b.id, b.strain, b.gen, b.parent || '', b.start, b.eggs,
        b.status === 'rearing' ? b.stage : (b.result ? b.result.stage : b.stage),
        b.status === 'rearing' ? b.count : (b.result ? b.result.finalCount : b.count)]);
    });
    downloadCsv('MosqCare_蚊笼列表.csv', rows);
    toast(T('已导出蚊笼列表 CSV（' + (rows.length - 1) + ' 条）', 'Cage list CSV exported (' + (rows.length - 1) + ' rows)'));
    return;
  }
  if (k === 'cage-records'){
    var TL = {stage:'阶段转换', feed:'饲喂', env:'环境记录', treat:'处置', close:'结笼'};
    var rows = [['笼号','蚊株','世代','记录类型','日期','时间','内容','数量','死亡','备注']];
    batches.forEach(function(b){
      var s = strains[b.strain] || {};
      b.records.forEach(function(r){
        var what = '';
        if (r.t === 'stage') what = r.from + '→' + r.to + (r.method ? '，方式 ' + r.method : '');
        else if (r.t === 'feed') what = r.type + (r.spec ? '，规格 ' + r.spec : '') + (r.way ? '，方式 ' + r.way : '');
        else if (r.t === 'env') what = (typeof r.temp === 'number' ? r.temp + '℃ / ' + r.hum + '%RH' : '') + (r.photo ? '，光周期 ' + r.photo : '') + (r.by ? '，' + r.by : '');
        else if (r.t === 'treat') what = r.type + '，出 ' + r.out + ' 只' + (r.to ? '，去向 ' + r.to : '') + (r.by ? '，经手 ' + r.by : '');
        else if (r.t === 'close') what = '结笼 ' + r.reason + '，终末 ' + r.n + ' 只';
        else what = Object.keys(r).filter(function(x){ return x !== 't'; }).map(function(x){ return x + '=' + r[x]; }).join('，');
        rows.push([b.id, s.name || b.strain, b.gen, TL[r.t] || r.t, r.d, r.tm || '', what,
          (r.n !== undefined && r.n !== null) ? r.n : '', (r.dead !== undefined && r.dead !== null) ? r.dead : '', r.note || '']);
      });
    });
    downloadCsv('MosqCare_蚊笼管理记录.csv', rows);
    toast(T('已导出蚊笼管理记录 CSV（' + (rows.length - 1) + ' 条，全部蚊笼的阶段转换/饲喂/环境/处置/结笼记录）', 'Cage records CSV exported (' + (rows.length - 1) + ' rows: stage/feed/env/treat/close across all cages)'));
    return;
  }
  if (k === 'research-surv'){
    // v3.2：生存分析长表（R survival / Python lifelines 即用的离散生存数据）
    var rows = [['笼号','蚊株','世代','天数','事件前存活','死亡数','事件后存活','删失']];
    var cnt = 0;
    batches.filter(function(b){ return b.result; }).forEach(function(b){
      var s = MosqResearch.survSeries(b);
      var alive = s.eggs;
      s.events.forEach(function(e){
        alive -= e.dead;
        rows.push([b.id, strains[b.strain] ? strains[b.strain].name : b.strain, b.gen, e.day, alive + e.dead, e.dead, alive, '否']);
        cnt++;
      });
      if (s.censorDay !== null){
        rows.push([b.id, strains[b.strain] ? strains[b.strain].name : b.strain, b.gen, s.censorDay, alive, 0, alive, '是']);
        cnt++;
      }
    });
    downloadCsv('MosqCare_生存分析长表.csv', rows);
    toast(T('已导出生存分析长表 CSV（' + cnt + ' 行事件/删失记录，可直接供 R survival / Python lifelines 使用）', 'Survival long-format CSV exported (' + cnt + ' event/censor rows, ready for R survival / Python lifelines)'));
    return;
  }
  if (k === 'research-life'){
    var LT = MosqResearch.stageLifeTable(batches.filter(function(b){ return b.result; }));
    var rows = [['阶段 x','l_x（进入数）','d_x（死亡数）','100q_x（阶段死亡率%）']];
    LT.rows.forEach(function(r){
      rows.push([r.stage, r.lx, r.dx, isFinite(r.qx) ? fmt1(r.qx) : '']);
    });
    rows.push([]);
    rows.push(['表观净繁殖率 R₀（终末成虫合计/起始卵合计）', isFinite(LT.R0) ? fmt1(LT.R0) : '']);
    rows.push(['世代均时 T（天，卵至成虫期转入平均）', isFinite(LT.T) ? fmt1(LT.T) : '']);
    rows.push(['内禀增长率 rₘ（近似，ln R₀ / T）', isFinite(LT.rm) ? fmt1(LT.rm) : '']);
    rows.push(['周限增长率 λ（e^rₘ）', isFinite(LT.lam) ? fmt1(LT.lam) : '']);
    rows.push(['倍增时间 DT（天，ln2 / rₘ）', isFinite(LT.dt) ? fmt1(LT.dt) : '']);
    rows.push(['说明', 'rₘ 为近似估算，精确计算需每雌逐日产卵量（lₓmₓ）数据；结果供品系间相对比较']);
    downloadCsv('MosqCare_生命表.csv', rows);
    toast(T('已导出生命表 CSV（含 R₀ / T / rₘ / λ / DT 参数行）', 'Life-table CSV exported (with R0 / T / rm / λ / DT parameter rows)'));
    return;
  }
  if (k === 'research-prism'){
    // v3.2：Prism 宽表模板（每笼一行，列式排布，供 GraphPad Prism 直接导入）
    var rows = [['笼号','品系','世代','卵','L1','L2','L3','L4','蛹','成虫','终末成虫','累积存活率%','卵历期天','幼虫历期天','蛹历期天','平均温度C','起始日期','结束日期','结束原因']];
    batches.filter(function(b){ return b.result; }).forEach(function(b){
      function entry(st){ var r = findStageRec(b, st); return r && typeof r.n === 'number' ? r.n : ''; }
      rows.push([b.id, strains[b.strain] ? strains[b.strain].name : b.strain, b.gen,
        b.eggs, entry('L1期'), entry('L2期'), entry('L3期'), entry('L4期'), entry('蛹期'), entry('成虫期'),
        b.result.finalCount, fmt1(survPct(b)),
        b.dur ? b.dur.egg : '', b.dur ? b.dur.larva : '', b.dur ? b.dur.pupa : '',
        typeof b.avgT === 'number' ? b.avgT : '', b.start, b.result.closeDate, b.result.reason]);
    });
    downloadCsv('MosqCare_Prism宽表.csv', rows);
    toast(T('已导出 Prism 宽表 CSV（每笼一行、列式排布，可直接导入 GraphPad Prism）', 'Prism wide-format CSV exported (one row per cage, column-oriented, ready for GraphPad Prism)'));
    return;
  }
  if (k === 'research-act'){
    // v3.2：活动分析科研导出（会话汇总 + 昼夜节律 24 小时聚合 + 光暗相参数）
    var rows = [['会话','蚊笼','摄像头','开始时刻','时长秒','平均活跃度指数','峰值活跃度指数','平均目标计数','视频文件']];
    actSessions.forEach(function(s){
      rows.push([s.id, s.cage, s.cam, s.start, s.dur, fmt1(s.meanAI), fmt1(s.peakAI), s.meanCnt == null ? '' : fmt1(s.meanCnt), (s.video && s.video.name) || '']);
    });
    var prof = actSessions.length ? MosqResearch.circadian(actSessions) : null;
    rows.push([]);
    rows.push(['小时','活跃度指数均值','采样数','相位']);
    if (prof){
      for (var h = 0; h < 24; h++){
        if (prof.hourMean[h] === null) continue;
        rows.push([h + ':00–' + ((h + 1) % 24) + ':00', fmt1(prof.hourMean[h]), prof.hourN[h], (h >= 6 && h < 20) ? '光相' : '暗相']);
      }
      rows.push([]);
      rows.push(['总体活跃度指数均值', fmt1(prof.overall)]);
      rows.push(['峰值时段', prof.peakHour >= 0 ? prof.peakHour + ':00–' + ((prof.peakHour + 1) % 24) + ':00' : '']);
      rows.push(['光相均值（06–20）', prof.lightMean === null ? '' : fmt1(prof.lightMean)]);
      rows.push(['暗相均值（20–06）', prof.darkMean === null ? '' : fmt1(prof.darkMean)]);
      rows.push(['说明', '光相按默认光周期 14L:10D、06:00 起光相假设划分']);
    }
    downloadCsv('MosqCare_活动度与昼夜节律.csv', rows);
    toast(T('已导出活动度与昼夜节律 CSV（会话汇总 + 24 小时聚合 + 光暗相参数）', 'Activity & circadian CSV exported (session summary + 24 h aggregation + phase parameters)'));
    return;
  }
  if (k === 'alerts'){
    var LV = {crit:'紧急', warn:'警告', info:'提示'};
    var ST = {open:'待处理', done:'已处理'};
    var rows = [['编号','级别','类型','关联蚊笼','内容','触发时间','状态','处理措施','处理人','处理时间']];
    alerts.forEach(function(a){
      rows.push([a.id, LV[a.level] || a.level, a.type, a.batch || '', a.msg, a.at, ST[a.state] || a.state,
        a.action || '', a.by || '', a.atDone || '']);
    });
    downloadCsv('MosqCare_预警中心.csv', rows);
    toast(T('已导出预警中心 CSV（' + (rows.length - 1) + ' 条）', 'Alerts CSV exported (' + (rows.length - 1) + ' rows)'));
    return;
  }
}
var importKind = '', importPreview = null;
function openImportModal(kind){
  importKind = kind;
  var isStrain = kind === 'strains';
  $('#im-title').textContent = isStrain ? tr('导入品系档案') : tr('导入蚊笼列表');
  $('#im-cols').textContent = isStrain ?
    '蚊株,名称,物种编码,拉丁名,来源,备注,蚊株缩写' :
    '笼号,蚊株,世代,亲代笼,起始日期,起始卵量,当前阶段,数量';
  $('#im-hint').textContent = '';
  $('#im-hint').style.color = '#64748b';
  $('#im-file').value = '';
  $('#im-ok').disabled = true;
  showModal('modal-import');
}
function onImportFile(inp){
  var f = inp.files && inp.files[0];
  var hint = $('#im-hint');
  if (!f){ importPreview = null; $('#im-ok').disabled = true; hint.textContent = ''; return; }
  if (!/\.csv$/i.test(f.name)){
    importPreview = null; $('#im-ok').disabled = true;
    hint.style.color = '#b91c1c'; hint.textContent = tr('仅支持 .csv 文件');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(){
    var lines = reader.result.replace(/^\ufeff/, '').split(/\r?\n/).filter(function(l){ return l.trim(); });
    if (lines.length < 2){
      importPreview = null; $('#im-ok').disabled = true;
      hint.style.color = '#b91c1c'; hint.textContent = tr('文件为空或缺少数据行');
      return;
    }
    importPreview = {lines: lines.slice(1), name: f.name};
    hint.style.color = '#1d4ed8';
    hint.textContent = T('已读取「' + f.name + '」：' + (lines.length - 1) + ' 条数据，点击「确认导入」完成合并。', 'Read "' + f.name + '": ' + (lines.length - 1) + ' data rows. Click "Confirm Import" to merge.');
    $('#im-ok').disabled = false;
  };
  reader.readAsText(f, 'utf-8');
}
// v2.2：合并逻辑抽出为独立函数，导入弹窗与启动时读取 data/ 用户 CSV 共用
function mergeStrainLines(lines){
  var add = 0, upd = 0, skip = 0;
  lines.forEach(function(line){
    var p = line.split(',');
    var key = (p[0] || '').trim();
    if (!key){ skip++; return; }
    var old = strains[key];
    if (old){ upd++; } else { add++; }
    strains[key] = {
      code: (p[2] || '').trim() || (old && old.code) || '',
      abbr: ((p[6] || '').trim() || (old && old.abbr) || '').toUpperCase(),
      name: (p[1] || '').trim() || (old && old.name) || key,
      latin: (p[3] || '').trim(),
      source: (p[4] || '').trim(),
      maxGen: (old && old.maxGen) || '—',
      note: (p[5] || '').trim()
    };
  });
  return {add: add, upd: upd, skip: skip};
}
function mergeCageLines(lines){
  var add = 0, upd = 0, skip = 0;
  lines.forEach(function(line){
    var p = line.split(',');
    var id = (p[0] || '').trim();
    var sk = (p[1] || '').trim();
    if (!id || !strains[sk]){ skip++; return; }
    var stage = (p[6] || '').trim();
    if (stage && STAGES.indexOf(stage) < 0){ skip++; return; }
    var base = {strain: sk, gen: (p[2] || '').trim() || 'F1',
      parent: (p[3] || '').trim() || null,
      start: (p[4] || '').trim() || TODAY,
      eggs: parseInt(p[5], 10) || 0};
    var ex = getBatch(id);
    if (ex){
      ex.strain = base.strain; ex.gen = base.gen; ex.parent = base.parent;
      ex.start = base.start; ex.eggs = base.eggs;
      if (stage && ex.status === 'rearing'){ ex.stage = stage; ex.count = parseInt(p[7], 10) || ex.count; }
      upd++;
    } else {
      batches.unshift(Object.assign({
        id: id, stage: stage || '卵期',
        count: parseInt(p[7], 10) || 0, coStages: null,
        status: 'rearing', lastFeed: null, records: []
      }, base));
      add++;
    }
  });
  return {add: add, upd: upd, skip: skip};
}
function doImport(){
  if (!importPreview) return;
  var r = importKind === 'strains' ? mergeStrainLines(importPreview.lines) : mergeCageLines(importPreview.lines);
  importPreview = null;
  closeModal();
  renderAll();
  toast(T('导入完成：新增 ' + r.add + '、更新 ' + r.upd + (r.skip ? '、跳过 ' + r.skip : '') + ' 条', 'Import done: ' + r.add + ' added, ' + r.upd + ' updated' + (r.skip ? ', ' + r.skip + ' skipped' : '')));
}
function printReport(){
  document.body.classList.add('print-report');
  window.print();
  setTimeout(function(){ document.body.classList.remove('print-report'); }, 300);
}
function openReport(bId){
  var b = getBatch(bId); if (!b) return;
  var s = strains[b.strain];
  var cur = tr(b.status === 'rearing' ? b.stage : (b.result ? b.result.stage : b.stage));
  var eggNo = 'E-' + b.id + '-' + b.start.replace(/-/g, '');
  var typeTxt = {stage:'阶段计数', feed:'饲喂', env:'环境', treat:'实验处理', close:'结束'};
  var rows = b.records.slice().reverse().map(function(r){
    var time = r.tm || (r.t === 'treat' ? '—' : '—');
    var qty = '—';
    if (r.t === 'stage') qty = r.n + (r.dead ? ' / −' + r.dead : '');
    else if (r.t === 'treat') qty = (r.out > 0 ? '−' + r.out : '—');
    else if (r.t === 'close') qty = r.n;
    var content = '';
    if (r.t === 'stage') content = (r.from === '—' ? tr('卵入笼') : tr(r.from) + ' → ' + tr(r.to)) + ' · ' + tr(r.method);
    else if (r.t === 'env') content = T('温度 ' + r.temp + '℃ · 湿度 ' + r.hum + '% · 光周期 ' + (r.photo || '14:10'), 'Temp ' + r.temp + '℃ · RH ' + r.hum + '% · L:D ' + (r.photo || '14:10'));
    else if (r.t === 'feed') content = tr(r.type) + (r.spec ? ' · ' + r.spec : '') + (r.way ? ' · ' + tr(r.way) : '');
    else if (r.t === 'treat') content = tr(r.type) + (r.to ? T(' · 去向：' + r.to, ' · to: ' + r.to) : '');
    else if (r.t === 'close') content = T('蚊笼结束 · ' + tr(r.reason), 'Cage closed · ' + tr(r.reason));
    if (r.note) content += T('（' + r.note + '）', ' (' + r.note + ')');
    var by = r.by ? tr(r.by) : '';
    return '<tr><td>' + r.d + '</td><td>' + time + '</td><td>' + tr(typeTxt[r.t]) + '</td><td>' + content + '</td><td>' + qty + '</td><td>' + by + '</td><td>' + (r.note || '') + '</td></tr>';
  }).join('');
  $('#rp-batch').textContent = b.id + ' · ' + tr(s.name) + ' ' + b.gen;
  $('#rp-sheet').innerHTML =
    '<div class="rp-head"><h4>' + tr('AeLabStr 蚊虫品系饲养记录单') + '</h4><div class="rp-ver">' + tr('由 MosqCare 生成') + '</div></div>' +
    '<div class="rp-grid">' +
      '<div class="rp-f">' + tr('蚊株名称') + '<b>' + tr(s.name) + '</b></div>' +
      '<div class="rp-f">' + tr('蚊株') + '<b>' + (s.code || '—') + '</b></div>' +
      '<div class="rp-f">' + tr('拉丁名') + '<b style="font-style:italic">' + s.latin + '</b></div>' +
      '<div class="rp-f">' + tr('世代') + '<b>' + b.gen + '</b></div>' +
      '<div class="rp-f">' + tr('笼号') + '<b>' + b.id + '</b></div>' +
      '<div class="rp-f">' + tr('卵编号') + '<b>' + eggNo + '</b></div>' +
      '<div class="rp-f">' + tr('起始日期') + '<b>' + b.start + '</b></div>' +
      '<div class="rp-f">' + tr('起始卵量') + '<b>' + b.eggs + ' ' + tr('粒') + '</b></div>' +
      '<div class="rp-f">' + tr('负责人') + '<b>' + (b.owner ? tr(b.owner) : '') + '</b></div>' +
      '<div class="rp-f">' + tr('记录日期') + '<b>' + TODAY + '</b></div>' +
      '<div class="rp-f">' + tr('当前阶段') + '<b>' + cur + '</b></div>' +
      '<div class="rp-f">' + tr('当前数量 / 存活率') + '<b>' + curCount(b) + ' · ' + fmt1(survPct(b)) + '%</b></div>' +
    '</div>' +
    '<table class="rp-tbl"><thead><tr><th>' + tr('日期') + '</th><th>' + tr('时间') + '</th><th>' + tr('类型') + '</th><th>' + tr('内容') + '</th><th>' + tr('数量') + '</th><th>' + tr('操作人') + '</th><th>' + tr('备注') + '</th></tr></thead><tbody>' + rows + '</tbody></table>' +
    '<div class="rp-foot"><span>' + tr('负责人签名：＿＿＿＿＿＿') + '</span><span>' + tr('复核人签名：＿＿＿＿＿＿') + '</span><span>' + tr('MosqCare · 蚊媒饲养工作台') + '</span></div>';
  showModal('modal-report');
}
function renderSettings(){
  var m = {tempLow:'th-temp-low', tempHigh:'th-temp-high', humLow:'th-hum-low', humHigh:'th-hum-high', surv:'th-surv', feedGap:'th-feed-gap', recGap:'th-rec-gap'};
  Object.keys(m).forEach(function(k){ var e = document.getElementById(m[k]); if (e) e.value = thresholds[k]; });
  // v2.2：本地数据文件夹入口（仅桌面版显示按钮）
  var el = $('#disk-info');
  if (el){
    if (MC_DISK){
      el.innerHTML =
        '<div class="ana-note" style="width:100%">' + tr('数据目录：') + '<b>' + esc(mcRootPath || '…') + '</b>' + tr('（data/ 存品系、蚊笼与预警；result/ 存监测会话、视频与导出文件，全部实时落盘）') + '</div>' +
        '<button class="mini-btn ghost" onclick="mcOpenFolder(\'data\')">' + tr('打开数据文件夹') + '</button>' +
        '<button class="mini-btn ghost" onclick="mcOpenFolder(\'result\')">' + tr('打开结果文件夹') + '</button>';
    } else {
      el.innerHTML = '<div class="ana-note" style="width:100%">' + tr('当前为浏览器预览模式，数据仅保存在内存中。桌面安装版会将全部记录实时写入安装目录的 data/（品系、蚊笼、预警）与 result/（监测会话、视频、导出文件）。') + '</div>';
    }
  }
}
// ================= 统计分析 =================
function setAna(k, v){ state.ana[k] = v; renderAnalytics(); }
var colS1 = '#2563eb', colS2 = '#0ea5e9';
function scolor(k){ return k === 'S1' ? colS1 : colS2; }
function renderAnalytics(){ MCStore.save();
  var f = state.ana;
  if (!batches.length){ $('#ana-charts').innerHTML = '<div class="empty">' + tr('暂无数据：新建蚊笼或从 CSV 导入后，此处将自动生成统计。') + '</div>'; $('#ana-table').innerHTML = ''; renderResearch(); return; }
  var closed = batches.filter(function(b){ return b.status !== 'rearing'; });
  if (f.strain !== 'all') closed = closed.filter(function(b){ return b.strain === f.strain; });
  if (f.range === '30') closed = closed.filter(function(b){ return b.start >= '2026-10-06'; });
  if (f.range === '90') closed = closed.filter(function(b){ return b.start >= '2026-08-07'; });
  var html = '', htmlDur = '', htmlCv = '', htmlSur = '', htmlMo = '', htmlOut = '';
  if (closed.length < 3){
    html += '<div class="empty" style="grid-column:1/-1">' + tr('筛选后已结束蚊笼不足 3 个，图表暂不呈现以避免误读（产能报表与关联分析可从下方入口查看）。') + '</div>';
  } else {
    // 平均发育历期（第一排左）
    var byStrain = {};
    closed.forEach(function(b){ if (b.dur) (byStrain[b.strain] = byStrain[b.strain] || []).push(b); });
    htmlDur = '<div class="chart-block"><div class="chart-title">' + tr('平均发育历期（天）') + '</div>';
    Object.keys(byStrain).forEach(function(k){
      var arr = byStrain[k]; if (!arr.length) return;
      var avg = function(key){ return arr.reduce(function(s, b){ return s + b.dur[key]; }, 0) / arr.length; };
      var c = scolor(k);
      [['卵期', avg('egg')], ['幼虫期', avg('larva')], ['蛹期', avg('pupa')]].forEach(function(it){
        htmlDur += '<div class="bar-row"><div class="bar-lbl">' + tr(strains[k].name) + ' · ' + tr(it[0]) + '</div><div class="bar-track"><div class="bar-fill" style="width:' + (it[1] / 10 * 100) + '%;background:' + c + ';opacity:.85"></div></div><div class="bar-val">' + fmt1(it[1]) + tr('天') + '</div></div>';
      });
    });
    htmlDur += '<div class="ana-note">' + tr('历期按已结束蚊笼的阶段记录汇总；横轴满刻度 10 天。') + '</div></div>';
    // 阶段转化率（第一排右）
    var convMap = {};
    closed.forEach(function(b){
      var r1 = findStageRec(b, 'L1期'), rP = findStageRec(b, '蛹期'), rL4 = findStageRec(b, 'L4期'), rA = findStageRec(b, '成虫期');
      if (r1) (convMap['孵化率'] = convMap['孵化率'] || []).push(r1.n / b.eggs * 100);
      if (rP && rL4) (convMap['化蛹率'] = convMap['化蛹率'] || []).push(rP.n / rL4.n * 100);
      if (rA && rP) (convMap['羽化率'] = convMap['羽化率'] || []).push(rA.n / rP.n * 100);
    });
    if (Object.keys(convMap).length){
      htmlCv = '<div class="chart-block"><div class="chart-title">' + tr('阶段转化率（已结束蚊笼平均值）') + '</div>';
      Object.keys(convMap).forEach(function(k){
        var avg = convMap[k].reduce(function(s, v){ return s + v; }, 0) / convMap[k].length;
        htmlCv += '<div class="bar-row"><div class="bar-lbl">' + tr(k) + T(' · ' + convMap[k].length + ' 笼', ' · ' + convMap[k].length + ' cages') + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.min(avg, 100) + '%;background:#2563eb;opacity:.85"></div></div><div class="bar-val">' + fmt1(avg) + '%</div></div>';
      });
      htmlCv += '<div class="ana-note">' + tr('孵化率 = L1 数量 ÷ 起始卵量；化蛹率 = 蛹 ÷ L4；羽化率 = 成虫 ÷ 蛹。') + '</div></div>';
    }
    // 各蚊笼累积存活率（第二排左）
    var sorted = closed.slice().sort(function(a, b){ return survPct(b) - survPct(a); });
    htmlSur = '<div class="chart-block"><div class="chart-title">' + tr('各蚊笼累积存活率（已结束蚊笼）') + '</div>' +
      '<div class="legend-row"><span><span class="lg-dot" style="background:' + colS1 + '"></span>' + tr('白纹伊蚊') + '</span><span><span class="lg-dot" style="background:' + colS2 + '"></span>' + tr('致倦库蚊') + '</span></div>';
    sorted.forEach(function(b){
      htmlSur += '<div class="bar-row"><div class="bar-lbl">' + b.id + ' · ' + tr(strains[b.strain].name) + ' ' + b.gen + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(survPct(b), 2) + '%;background:' + scolor(b.strain) + '"></div></div><div class="bar-val">' + fmt1(survPct(b)) + '%</div></div>';
    });
    htmlSur += '</div>';
    // 月度产出趋势（第三排左）
    var monMap = {};
    closed.forEach(function(b){
      if (!b.result) return;
      var m = b.result.closeDate.slice(0, 7);
      var g = monMap[m] = monMap[m] || {n:0, out:0};
      g.n++; g.out += b.result.finalCount;
    });
    var mons = Object.keys(monMap).sort();
    if (mons.length){
      var maxOut = Math.max.apply(null, mons.map(function(m){ return monMap[m].out; }));
      htmlMo = '<div class="chart-block"><div class="chart-title">' + tr('月度产出趋势（按蚊笼结束月份）') + '</div>';
      mons.forEach(function(m){
        var g = monMap[m];
        htmlMo += '<div class="bar-row"><div class="bar-lbl">' + m + T(' · ' + g.n + ' 笼', ' · ' + g.n + ' cages') + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(g.out / maxOut * 100, 2) + '%;background:#0ea5e9;opacity:.85"></div></div><div class="bar-val">' + g.out + ' ' + tr('只') + '</div></div>';
      });
      htmlMo += '<div class="ana-note">' + tr('按结束日期月份聚合已结束蚊笼的终末成虫数量；「实验取用」与「产卵收获」均计入产出。') + '</div></div>';
    }
    // 各蚊株累积产出（第三排右）
    var outMap = {};
    closed.forEach(function(b){ if (b.result) (outMap[b.strain] = outMap[b.strain] || []).push(b.result.finalCount); });
    if (Object.keys(outMap).length){
      var maxOutS = Math.max.apply(null, Object.keys(outMap).map(function(k){ return outMap[k].reduce(function(s, v){ return s + v; }, 0); }));
      htmlOut = '<div class="chart-block"><div class="chart-title">' + tr('各蚊株累积产出（终末成虫合计）') + '</div>';
      Object.keys(outMap).forEach(function(k){
        var tot = outMap[k].reduce(function(s, v){ return s + v; }, 0);
        htmlOut += '<div class="bar-row"><div class="bar-lbl">' + tr(strains[k].name) + T(' · ' + outMap[k].length + ' 笼', ' · ' + outMap[k].length + ' cages') + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(tot / maxOutS * 100, 2) + '%;background:' + scolor(k) + ';opacity:.85"></div></div><div class="bar-val">' + tot + ' ' + tr('只') + '</div></div>';
      });
      htmlOut += '<div class="ana-note">' + tr('按蚊株聚合已结束蚊笼的终末成虫数量。') + '</div></div>';
    }
  }
  // 世代对比（第二排右）
  var anaScope = batches.filter(function(b){ return f.strain === 'all' || b.strain === f.strain; });
  var htmlGen = '';
  if (anaScope.length){
    var genMap = {};
    anaScope.forEach(function(b){
      var key = b.strain + '|' + b.gen;
      var g = genMap[key] = genMap[key] || {strain:b.strain, gen:b.gen, eggs:0, cnt:0, n:0, rearing:false};
      g.eggs += b.eggs; g.cnt += curCount(b); g.n++; if (b.status === 'rearing') g.rearing = true;
    });
    var gens = Object.keys(genMap).map(function(k){ return genMap[k]; }).sort(function(a, b){ return a.strain === b.strain ? (a.gen < b.gen ? -1 : 1) : (a.strain < b.strain ? -1 : 1); });
    htmlGen = '<div class="chart-block"><div class="chart-title">' + tr('世代对比（累积存活率 · 按品系 / 世代聚合）') + '</div>';
    gens.forEach(function(g){
      var pct = g.eggs ? g.cnt / g.eggs * 100 : 0;
      var tag = g.rearing ? ' <span style="font-size:11px;color:#1d4ed8">' + tr('含在养') + '</span>' : '';
      htmlGen += '<div class="bar-row"><div class="bar-lbl">' + tr(strains[g.strain].name) + ' ' + g.gen + T(' · ' + g.n + ' 笼', ' · ' + g.n + ' cages') + tag + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(pct, 2) + '%;background:' + scolor(g.strain) + ';opacity:.9"></div></div><div class="bar-val">' + fmt1(pct) + '%</div></div>';
    });
    htmlGen += '<div class="ana-note">' + tr('含在养蚊笼即时存活率仅供监测参考，正式对比以已结束蚊笼为准。') + '</div></div>';
  }
  $('#ana-charts').innerHTML = html + htmlDur + htmlCv + htmlSur + htmlGen + htmlMo + htmlOut;
  $('#ana-table').innerHTML = '<div class="ana-btns">' +
    '<div class="ana-btn-card" onclick="openAnaExtra(\'tbl\')"><b>' + tr('产能报表') + '</b><span>' + tr('已结束蚊笼明细：起始卵量 / 终末数量 / 累积存活率 / 平均温度 / 结束原因') + '</span></div>' +
    '<div class="ana-btn-card" onclick="openAnaExtra(\'scatter\')"><b>' + tr('环境与存活关联') + '</b><span>' + tr('蚊笼平均温度 × 累积存活率 散点图（仅呈现相关性）') + '</span></div></div>';
  renderResearch();
}
function anaClosed(){
  var f = state.ana;
  var closed = batches.filter(function(b){ return b.status !== 'rearing'; });
  if (f.strain !== 'all') closed = closed.filter(function(b){ return b.strain === f.strain; });
  if (f.range === '30') closed = closed.filter(function(b){ return b.start >= '2026-10-06'; });
  if (f.range === '90') closed = closed.filter(function(b){ return b.start >= '2026-08-07'; });
  return closed;
}
function anaTableHtml(){
  var closed = anaClosed();
  if (!closed.length) return '<div class="empty">' + tr('暂无已结束蚊笼：结束后自动进入产能报表。') + '</div>';
  var rows = closed.slice().sort(function(a, b){ return a.result.closeDate < b.result.closeDate ? 1 : -1; });
  var tbl = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + tr('笼号') + '</th><th>' + tr('品系 / 世代') + '</th><th>' + tr('起始卵量') + '</th><th>' + tr('终末数量') + '</th><th>' + tr('累积存活率') + '</th><th>' + tr('平均温度') + '</th><th>' + tr('结束日期') + '</th><th>' + tr('结束原因') + '</th></tr></thead><tbody>';
  rows.forEach(function(b){
    tbl += '<tr><td><b>' + b.id + '</b></td><td>' + tr(strains[b.strain].name) + ' / ' + b.gen + '</td><td>' + b.eggs + '</td><td>' + b.result.finalCount + '</td><td class="surv">' + fmt1(survPct(b)) + '%</td><td>' + (typeof b.avgT === 'number' ? b.avgT + '℃' : '—') + '</td><td>' + b.result.closeDate + '</td><td>' + tr(b.result.reason) + '</td></tr>';
  });
  tbl += '</tbody></table></div>';
  return tbl;
}
function anaScatterHtml(){
  var pts = anaClosed().filter(function(b){ return typeof b.avgT === 'number'; });
  if (pts.length < 3) return '';
  var x0 = 46, y0 = 192, x1 = 368, y1 = 18;
  function px(v){ return x0 + (v - 25) / (30 - 25) * (x1 - x0); }
  function py(v){ return y0 - (v - 70) / (92 - 70) * (y0 - y1); }
  var svg = '<svg width="380" height="224" viewBox="0 0 380 224" role="img" aria-label="环境与存活关联散点图" style="max-width:100%">';
  svg += '<line x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '" stroke="#cbd5e1"/><line x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '" stroke="#cbd5e1"/>';
  for (var t = 25; t <= 30; t++){ svg += '<text x="' + px(t) + '" y="' + (y0 + 14) + '" font-size="10" fill="#94a3b8" text-anchor="middle">' + t + '</text>'; }
  for (var sv = 70; sv <= 90; sv += 10){ svg += '<text x="' + (x0 - 6) + '" y="' + (py(sv) + 3) + '" font-size="10" fill="#94a3b8" text-anchor="end">' + sv + '</text>'; }
  svg += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y0 + 30) + '" font-size="11" fill="#64748b" text-anchor="middle">' + tr('蚊笼平均饲养温度（℃）') + '</text>';
  svg += '<text x="14" y="' + ((y0 + y1) / 2) + '" font-size="11" fill="#64748b" text-anchor="middle" transform="rotate(-90 14 ' + ((y0 + y1) / 2) + ')">' + tr('累积存活率（%）') + '</text>';
  pts.forEach(function(b){
    svg += '<circle cx="' + px(b.avgT).toFixed(1) + '" cy="' + py(survPct(b)).toFixed(1) + '" r="5.5" fill="' + scolor(b.strain) + '" fill-opacity=".85" stroke="#fff"><title>' + b.id + ' · ' + tr(strains[b.strain].name) + ' ' + b.gen + '：' + b.avgT + '℃ / ' + fmt1(survPct(b)) + '%</title></circle>';
  });
  svg += '</svg>';
  return '<div class="scatter-wrap">' + svg + '</div><div class="ana-note">' + tr('每个点为一个已结束蚊笼。图示仅呈现相关性，不构成因果结论。') + '</div>';
}
function openAnaExtra(kind){
  var title = kind === 'tbl' ? tr('产能报表') : tr('环境与存活关联');
  var body = kind === 'tbl' ? anaTableHtml() : anaScatterHtml();
  if (!body) body = '<div class="empty">' + tr('样本不足，暂不呈现，避免误读（需至少 3 个含环境记录的已结束蚊笼）。') + '</div>';
  $('#ax-title').textContent = title;
  $('#ax-body').innerHTML = body;
  showModal('modal-ana-extra');
}
// ================= 联动 =================
function importPreset(){
  var p = presetData();
  strains = p.strains; batches = p.batches; alerts = p.alerts;
  seq = p.seq; alertSeq = p.alertSeq; state.currentBatch = p.currentBatch;
  actSessions = p.sessions || []; actSeq = actSessions.length;   // v3.2：预设含示例监测会话
  renderAll(); toast(tr('已导入预设数据'));
}
var clearArmed = false, clearTimer = null;
function clearAllData(){
  var btn = $('#btn-clear-data');
  if (!clearArmed){
    clearArmed = true;
    btn.textContent = tr('确认清空全部数据');
    clearTimer = setTimeout(function(){ clearArmed = false; btn.textContent = tr('删除预设数据'); }, 3000);
    return;
  }
  clearTimeout(clearTimer); clearArmed = false; btn.textContent = tr('删除预设数据');
  batches.length = 0;
  Object.keys(strains).forEach(function(k){ delete strains[k]; });
  alerts.length = 0;
  actSessions.length = 0;   // v3.2：预设清除时同步清空监测会话
  seq = 1; alertSeq = 1; actSeq = 0;
  state.currentBatch = null;
  renderAll();
  navigate('settings');
  toast(T('已清空全部预设数据（品系 / 蚊笼 / 记录 / 预警），可从 CSV 导入或新建开始', 'All demo data erased (strains / cages / records / alerts). Import from CSV or start fresh.'));
}
function openFeature(id){
  var el = document.getElementById(id); if (!el) return;
  switchTab('detail');
  el.scrollIntoView({behavior:'smooth', block:'start'});
  el.classList.remove('feat-flash'); void el.offsetWidth; el.classList.add('feat-flash');
}
function gotoProto(page, region){
  if (page === 'modal-record'){ openRecordModal(state.currentBatch, state.rtab || 'feed'); return; }
  if (page === 'modal-close'){ openCloseModal(); return; }
  if (state.page !== page) navigate(page);
  var r = region ? document.getElementById(region) : null;
  if (r){
    r.classList.remove('region-flash'); void r.offsetWidth; r.classList.add('region-flash');
    setTimeout(function(){ r.classList.remove('region-flash'); }, 2200);
  }
}
// ================= 事件委托 =================
document.addEventListener('click', function(e){
  var t = e.target, el;
  if (e.target.id === 'modal-layer'){ closeModal(); return; }
  if (el = t.closest('[data-close-modal]')){ closeModal(); return; }
  if (el = t.closest('[data-open-modal]')){
    var k = el.dataset.openModal;
    if (k === 'record') openRecordModal(el.dataset.batch || state.currentBatch, el.dataset.rtab || state.rtab);
    else if (k === 'new-batch') openNewBatchModal();
    else if (k === 'new-strain'){
      $('#f-ns-name').value = ''; $('#f-ns-code').value = ''; $('#f-ns-abbr').value = ''; $('#f-ns-latin').value = '';
      $('#f-ns-source').value = ''; $('#f-ns-note').value = '';
      clearErrs(); showModal('modal-new-strain');
    }
    else if (k === 'close') openCloseModal();
    return;
  }
  if (el = t.closest('[data-goto]')){ gotoProto(el.dataset.goto, el.dataset.region); return; }
  if (el = t.closest('[data-nav]')){ navigate(el.dataset.nav); return; }
  if (el = t.closest('[data-open-batch]')){ openBatch(el.dataset.openBatch); return; }
  if (el = t.closest('[data-open-report]')){ openReport(el.dataset.openReport); return; }
  if (el = t.closest('[data-open-strain]')){ openStrainModal(el.dataset.openStrain); return; }
  if (el = t.closest('[data-import]')){ openImportModal(el.dataset.import); return; }
  if (el = t.closest('[data-export]')){ exportCsv(el.dataset.export); return; }
  if (el = t.closest('[data-iot-snap]')){ iotSnap(el.dataset.iotSnap); return; }
  if (el = t.closest('[data-iot-cam]')){ iotCam(el.dataset.iotCam); return; }
  if (el = t.closest('[data-iot-plug]')){ iotPlug(el.dataset.iotPlug); return; }
  if (el = t.closest('[data-iot-help]')){ iotHelp(el.dataset.iotHelp); return; }
});
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeModal(); });
// ================= 初始化 =================
function renderAll(){ renderDashboard(); renderStrains(); renderBatches(); renderDetail(); renderAnalytics(); checkOvipReminder(); checkForecastDeviation(); renderAlerts(); renderSettings(); }
// v2.2：桌面版启动时先从安装目录 data/ 与 result/ 恢复上次数据，再渲染
mcBoot().then(function(loaded){
  if (MC_DISK && loaded) toast(T('已从本地数据文件夹恢复上次记录', 'Restored previous records from the local data folder'));
  renderAll();
  navigate('dashboard');
  applyLang();
});
