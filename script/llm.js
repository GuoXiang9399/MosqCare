// ================= MosqLLM v0.1 AI 补录草稿（v4.0 · 智能感知二期 · 实验性） =================
// 原则：
//   1) 浏览器预览模式 =「粘贴草稿」通道：用户粘贴任意 AI 助手生成的补录草稿文本，
//      应用在本地做确定性规则解析（非模型推理），全部计算在本机完成、无网络通信；
//   2) AI 输出只是草稿：解析结果须人工核对并确认保存后才写入台账
//      （submitStage 写 origin:'ai-draft' + llm 元数据；时间线复用「AI 预填 · 人工确认」徽标）；
//   3) 解析失败 / 字段不足：回退纯手工表单，不阻塞记录流程；
//   4) llama-crab 集成缝（本版未启用）：Tauri 桌面版未来在 provider() 返回 'llama-crab' 并补
//      generateDraft()——经 tauri-plugin-llama-crab（GGUF 量化，Qwen3 系列为候选）由本机模型
//      生成草稿文本后，仍走同一条 parse → 结构化预览 → 人工确认管线。
//      构建前提：Rust MSRV 1.88 + MSVC C++ 工具链 + CMake（调研报告 §3；本机工具链缺失，
//      见 .trae/documents/mosqcare-v40b-LLM记录辅助实现计划.md §0）。
// 算法注册：MosqAlgo.register('mosqllm', '0.1', MosqLLM)

var MosqLLM = (function(){
  // —— 通道探测（缝）：llama-crab 插件接入后此处返回 'llama-crab' 并补 generateDraft() ——
  function provider(){ return 'paste'; }

  var CNUM = { '1':1, '2':2, '3':3, '4':4, '一':1, '二':2, '三':3, '四':4 };

  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function normDate(y, m, d){
    y = +y; m = +m; d = +d;
    if (!(y > 2000 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    var dt = new Date(y, m - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    return y + '-' + pad2(m) + '-' + pad2(d);
  }
  function shiftToday(days){
    var p = String(TODAY).split('-'), dt = new Date(+p[0], +p[1] - 1, +p[2]);
    dt.setDate(dt.getDate() + days);
    return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
  }
  // 日期：YYYY-MM-DD / YYYY/MM/DD / M月D日 / 今天·昨日（相对 TODAY）
  function parseDate(text){
    var m = /(\d{4})[-/.年]\s*(\d{1,2})[-/.月]\s*(\d{1,2})\s*日?/.exec(text);
    if (m) return normDate(m[1], m[2], m[3]);
    m = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/.exec(text);
    if (m) return normDate(TODAY.slice(0, 4), m[1], m[2]);
    if (/今天|今日/.test(text)) return TODAY;
    if (/昨天|昨日/.test(text)) return shiftToday(-1);
    return null;
  }

  function stageFromWord(w){
    if (/成虫/.test(w)) return '成虫期';
    if (/蛹/.test(w)) return '蛹期';
    if (/卵/.test(w)) return '卵期';
    return null;
  }
  var STAGE_TOK = /L\s*([1-4])|第?\s*([1-4一二三四])\s*[龄期]|成虫期?|蛹期?|卵期?/g;
  function tokStage(mm){
    if (mm[1] !== undefined) return 'L' + CNUM[mm[1]] + '期';
    if (mm[2] !== undefined) return 'L' + CNUM[mm[2]] + '期';
    return stageFromWord(mm[0]);
  }
  // 转入阶段：优先「转入 / 移入 / 转到 / 分入 / 进入」类关键词后的首个阶段词；
  // 无关键词则取提到的最高阶段（目标通常为更晚阶段）。「卵入笼」属建笼，此处如实给出卵期，
  // 由预填阶段的一致性校验拒绝。
  function parseStage(text){
    var kw = /(?:转入|移入|转到|转至|分入|进入|接入|转(?![出运发]))/.exec(text);
    var best = null, bi = -1, mm;
    STAGE_TOK.lastIndex = 0;
    while ((mm = STAGE_TOK.exec(text))){
      var st = tokStage(mm), idx = STAGES.indexOf(st);
      if (st && idx > bi){ bi = idx; best = st; }
      if (kw && mm.index >= kw.index && mm.index - (kw.index + kw[0].length) <= 4){
        return st;   // 关键词后紧邻的阶段词即转入目标
      }
    }
    return best;
  }

  // 淘汰：淘汰 / 死亡 / 死掉 / 羽化失败 后的数字（返回值与关键词位置，供计数排除）
  function parseDead(text){
    var m = /(?:淘汰|死亡|死掉|羽化失败)\s*[^0-9]{0,6}?(\d{1,4})/.exec(text);
    return m ? { v: +m[1], idx: m.index, end: m.index + m[0].length } : { v: null, idx: -1, end: -1 };
  }
  // 转入数量：带量词的数字优先（跳过淘汰语境），退回「转入/数量/共」引导的数字
  function parseCount(text, dead){
    var re = /(\d{1,5})\s*(?:只|头|个|条|枚|粒)/g, m;
    while ((m = re.exec(text))){
      if (dead.idx >= 0 && m.index >= dead.idx - 2 && m.index <= dead.end + 2) continue;
      return +m[1];
    }
    m = /(?:转入|移入|转到|转至|分入|进入)\s*(?:第?\s*[1-4一二三四]\s*[龄期]?)?\s*[^0-9]{0,2}(\d{1,5})/.exec(text) ||
        /(?:数量|计数|共)\s*[^0-9]{0,4}(\d{1,5})/.exec(text);
    return m ? +m[1] : null;
  }
  // 备注：仅认显式引导符（备注 / 说明 / 注 + 冒号），不猜测残文
  function parseNote(text){
    var m = /(?:备注|说明|注)\s*[：:]\s*([^\n]{1,80})/.exec(text);
    return m ? m[1].trim() : null;
  }

  function parse(text){
    text = String(text || '');
    var dead = parseDead(text);
    var d = parseDate(text), to = parseStage(text), n = parseCount(text, dead), note = parseNote(text);
    var fields = 0;
    [d, to, n, dead.v, note].forEach(function(x){ if (x !== null && x !== undefined && x !== '') fields++; });
    return { d: d, to: to, n: n, dead: dead.v, note: note, fields: fields, ok: !!(to && n), inLen: text.length };
  }

  return { provider: provider, parse: parse };
})();
if (typeof MosqAlgo !== 'undefined') MosqAlgo.register('mosqllm', '0.1', MosqLLM);

// ================= v4.0 · 智能感知二期：AI 补录草稿模态 =================
var llmState = { parsed: null };
function llmProviderHint(){
  if (MosqLLM.provider() === 'llama-crab') return tr('当前通道：内置本机模型（llama-crab）');   // 未来接入
  return T('当前通道：粘贴草稿（浏览器预览模式）。内置本机模型为 Tauri 桌面版规划能力，本版未启用。',
           'Current channel: paste draft (browser preview). A built-in local model is planned for the Tauri desktop edition and is not enabled in this version.');
}
function openLlmModal(){
  var b = getBatch(state.currentBatch);
  if (!b || b.status !== 'rearing'){ toast(tr('该蚊笼不在饲养中，记录入口已关闭')); return; }
  llmState = { parsed: null };
  document.getElementById('f-llm-text').value = '';
  document.getElementById('llm-readout').textContent = '';
  var pv = document.getElementById('llm-preview');
  pv.style.display = 'none'; pv.innerHTML = '';
  document.getElementById('llm-model-hint').textContent = llmProviderHint();
  showModal('modal-llm');
}
function onLlmParse(){
  var text = document.getElementById('f-llm-text').value;
  if (!text.trim()){ toast(tr('请先粘贴草稿文本')); return; }
  llmState.parsed = MosqLLM.parse(text);
  renderLlmPreview(llmState.parsed);
}
function llmClearParse(){
  llmState = { parsed: null };
  document.getElementById('f-llm-text').value = '';
  document.getElementById('llm-readout').textContent = '';
  var pv = document.getElementById('llm-preview');
  pv.style.display = 'none'; pv.innerHTML = '';
}
function renderLlmPreview(r){
  var b = getBatch(state.currentBatch);
  var pv = document.getElementById('llm-preview');
  document.getElementById('llm-readout').textContent =
    T('输入 ' + r.inLen + ' 字 · 识别 ' + r.fields + ' 个字段', 'Input ' + r.inLen + ' chars · ' + r.fields + ' field(s) recognised');
  function row(label, v, fmt){
    var hit = v !== null && v !== undefined && v !== '';
    return '<tr><td style="width:96px;color:#475569">' + label + '</td><td style="font-weight:600">' +
      (hit ? '<span style="color:#166534">✓</span> ' + (fmt !== undefined ? fmt : v) : '<span style="color:#9ca3af">— ' + tr('未识别') + '</span>') + '</td></tr>';
  }
  var next = STAGES[STAGES.indexOf(b.stage) + 1];
  var mismatch = r.to && next && r.to !== next;
  var rows =
    row(T('日期', 'Date'), r.d) +
    row(T('转入阶段', 'Next stage'), r.to, r.to ? tr(r.to) : '') +
    row(T('转入数量', 'Transferred in'), r.n) +
    row(T('淘汰 / 死亡数', 'Culled / dead'), r.dead === null ? '' : r.dead, r.dead) +
    row(T('备注', 'Note'), r.note, esc(r.note));
  pv.innerHTML =
    '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px;background:#f8fafc">' +
    '<table style="font-size:12.5px;line-height:1.9">' + rows + '</table>' +
    (mismatch ? '<div style="font-size:12.5px;color:#92400e;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:6px 10px;margin-top:4px">' +
      T('草稿阶段（' + tr(r.to) + '）与当前笼的下一阶段（' + tr(next) + '）不符：请核对草稿或改用手工录入。',
        'Draft stage (' + tr(r.to) + ') does not match the cage next stage (' + tr(next) + '): check the draft or enter manually.') + '</div>' : '') +
    (r.ok && !mismatch ? '<div style="margin-top:8px"><button type="button" class="btn primary" onclick="llmPrefill()">' +
      T('带入新增记录（阶段计数）· 人工确认后入账', 'Bring into New Record (stage count) · recorded after human confirmation') + '</button></div>' : '') +
    (!r.ok ? '<div class="ana-note" style="margin:6px 0 0">' +
      T('未能识别出足够的结构化字段（至少需要转入阶段与转入数量）：请补充草稿描述或改用手工表单。',
        'Not enough structured fields recognised (next stage and transferred count are required): expand the draft or use the manual form.') + '</div>' : '') +
    '</div>';
  pv.style.display = 'block';
}
function llmPrefill(){
  var r = llmState.parsed, b = getBatch(state.currentBatch);
  if (!r || !r.ok || !b) return;
  var next = STAGES[STAGES.indexOf(b.stage) + 1];
  if (r.to !== next){ toast(T('草稿阶段与当前下一阶段不符，未带入。', 'Draft stage does not match the cage next stage — not prefilled.')); return; }
  // AI 草稿元数据随记录写入台账（submitStage 消费后清空）；字段只是预填，须人工核对保存
  window.__llmPrefill = { source: 'external-paste', model: null, inLen: r.inLen, fields: r.fields };
  closeModal();
  openRecordModal(b.id, 'stage');
  if (r.d) document.getElementById('f-stage-date').value = r.d;
  if (r.n) document.getElementById('f-stage-n').value = r.n;
  if (r.dead) document.getElementById('f-stage-dead').value = r.dead;
  if (r.note) document.getElementById('f-stage-note').value = r.note;
  toast(T('已带入「新增记录」（阶段计数）：请核对日期、数量与淘汰数后保存。',
          'Brought into New Record (stage count): review the date, count and culls before saving.'));
}
