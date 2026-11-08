// ================= MosqCare v2.2 本地落盘（data/ 与 result/） =================
// 桌面版（Tauri）：所有记录实时写入安装目录下 data/（品系、蚊笼、预警）与
// result/（监测会话、视频、导出文件），关闭软件不丢失。
// 浏览器预览（MC_DISK=false）：保持原行为（内存 + 浏览器下载）。
var MC_DISK = !!(window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke);
var mcRootPath = '';
function mcInvoke(cmd, args){
  return window.__TAURI__.core.invoke(cmd, args || {});
}

// —— 变更防抖落盘：数据变更后 600ms 合并写盘 ——
var MCStore = {
  timer: null,
  save: function(){
    if (!MC_DISK) return;
    clearTimeout(MCStore.timer);
    MCStore.timer = setTimeout(MCStore.flush, 600);
  },
  flush: function(){
    try {
      mcInvoke('mc_write', {rel: 'data/strains.json', content: JSON.stringify({strains: strains})});
      mcInvoke('mc_write', {rel: 'data/cages.json', content: JSON.stringify({seq: seq, batches: batches})});
      mcInvoke('mc_write', {rel: 'data/alerts.json', content: JSON.stringify({alertSeq: alertSeq, alerts: alerts})});
      mcInvoke('mc_write', {rel: 'result/sessions.json', content: JSON.stringify({actSeq: actSeq, actSessions: actSessions})});
    } catch(e){}
  }
};

// —— 启动恢复：优先读取 JSON；用户放入 data/ 的导出 CSV（品系档案/蚊笼列表）也会被读取合并 ——
function mcBoot(){
  if (!MC_DISK) return Promise.resolve(false);
  return mcInvoke('mc_root').then(function(root){
    mcRootPath = root;
    return Promise.all([
      mcInvoke('mc_read', {rel: 'data/strains.json'}).catch(function(){ return null; }),
      mcInvoke('mc_read', {rel: 'data/cages.json'}).catch(function(){ return null; }),
      mcInvoke('mc_read', {rel: 'data/alerts.json'}).catch(function(){ return null; }),
      mcInvoke('mc_read', {rel: 'result/sessions.json'}).catch(function(){ return null; })
    ]);
  }).then(function(res){
    try {
      if (res[0]){ var o = JSON.parse(res[0]); if (o && o.strains) strains = o.strains; }
      if (res[1]){ var o = JSON.parse(res[1]); if (o && o.batches){ batches = o.batches; seq = o.seq || (batches.length + 1); } }
      if (res[2]){ var o = JSON.parse(res[2]); if (o && o.alerts){ alerts = o.alerts; alertSeq = o.alertSeq || (alerts.length + 1); } }
      if (res[3]){ var o = JSON.parse(res[3]); if (o && o.actSessions){ actSessions = o.actSessions; actSeq = o.actSeq || actSessions.length; } }
    } catch(e){}
    return mcImportUserCsv().then(function(n){
      if (n > 0) MCStore.flush();
      return n > 0 || res.some(Boolean);
    });
  }).catch(function(){ return false; });
}
function mcImportUserCsv(){
  return mcInvoke('mc_list', {rel: 'data'}).then(function(names){
    var strainCsv = names.filter(function(n){ return /品系档案.*\.csv$/i.test(n); })[0];
    var cageCsv = names.filter(function(n){ return /蚊笼列表.*\.csv$/i.test(n); })[0];
    return Promise.all([
      strainCsv ? mcInvoke('mc_read', {rel: 'data/' + strainCsv}) : Promise.resolve(null),
      cageCsv ? mcInvoke('mc_read', {rel: 'data/' + cageCsv}) : Promise.resolve(null)
    ]).then(function(txts){
      var total = 0;
      if (txts[0]) total += mcMergeCsvText(txts[0], 'strains');
      if (txts[1]) total += mcMergeCsvText(txts[1], 'cages');
      if (total > 0) toast(T('已从 data/ 读取用户文件并合并（' + total + ' 条变更）', 'User files in data/ imported (' + total + ' changes)'));
      return total;
    });
  }).catch(function(){ return 0; });
}
function mcMergeCsvText(txt, kind){
  try {
    var lines = txt.replace(/^\ufeff/, '').split(/\r?\n/).filter(function(l){ return l.trim(); });
    if (lines.length < 2) return 0;
    var r = kind === 'strains' ? mergeStrainLines(lines.slice(1)) : mergeCageLines(lines.slice(1));
    return r.add + r.upd;
  } catch(e){ return 0; }
}

// —— 设置页「本地数据文件夹」入口 ——
function mcOpenFolder(rel){
  mcInvoke('mc_open', {rel: rel}).catch(function(){ toast(T('打开文件夹失败', 'Failed to open folder')); });
}
