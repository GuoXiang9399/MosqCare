// ================= MosqCV v0.1 照片计数辅助（v4.0 新增，智能感知 · 实验性） =================
// 推理底座：onnxruntime-web 1.23.2 本地自托管（ui/vendor/ort/，零 CDN、无遥测）。
// 原则：
//   1) 模型不入库、不随软件分发——用户在侧栏「模型」页本地导入 .onnx（ArrayBuffer 直建会话）；
//   2) 全流程本机：图像仅在本机识别，不入库不上传，无网络通信；
//   3) AI 输出只是草稿：仅「蚊虫计数领域模型」（purpose='domain'）可预填计数，
//      且必须经人工确认保存后才写入台账（记录带 origin:'ai-draft' 与 cv 元数据）；
//   4) 演示模型（COCO 通用预训练）不识别蚊虫，仅验证流程，计数不可写入台账（诚实脚注）。
// 算法注册：MosqAlgo.register('mosqcv', '0.1', MosqCV)
var MosqCV = (function(){
  var IMG = 640;                       // 模型输入边长（与 spike 验证口径一致）
  var st = { session:null, card:null, purpose:'demo' };
  var proc = null;                     // 离屏 640×640 预处理画布（懒建）
  // 运行时定位：不设 wasmPaths，ORT 默认以 ort.all.min.js 所在目录（./vendor/ort/）
  // 解析 wasm 与 .mjs loader——与 spike 已验证配置一致；显式设置反而因模块说明符解析失败。
  // （Tauri 打包为 resource 后，如自定义协议下 scriptDirectory 解析异常，再显式指定绝对路径。）

  // —— 置信度阈值（localStorage 持久；阈值以下检出不计入预填） ——
  function conf(){
    var v = NaN;
    try { v = parseFloat(localStorage.getItem('mcCvConf')); } catch(e){}
    return (v >= 0.05 && v <= 0.9) ? v : 0.25;
  }
  function setConf(v){
    var n = parseFloat(v); if (!(n >= 0.05 && n <= 0.9)) return;
    try { localStorage.setItem('mcCvConf', String(n)); } catch(e){}
  }

  // —— 模型卡：SHA-256（secure context 下用 crypto.subtle，否则如实标注不可用） ——
  function sha256Hex(buf){
    if (!(window.crypto && crypto.subtle && crypto.subtle.digest)) return Promise.resolve('unavailable（非 secure context）');
    return crypto.subtle.digest('SHA-256', buf).then(function(h){
      var a = new Uint8Array(h), s = '';
      for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2);
      return s;
    });
  }
  function status(){ return { loaded:!!st.session, purpose:st.purpose, card:st.card, conf:conf() }; }
  function unload(){
    try { if (st.session) st.session.release(); } catch(e){}
    st.session = null; st.card = null;
  }

  // —— 模型导入：文件 → ArrayBuffer → 会话（webgpu 优先、wasm 回退） ——
  // purpose: 'demo'（COCO 演示）| 'domain'（蚊虫计数领域模型，可预填）
  function loadModel(file, purpose, cb){
    if (typeof ort === 'undefined'){ cb('推理运行时未加载（缺少 vendor/ort/）'); return; }
    if (!/\.onnx$/i.test(file.name)){ cb('仅支持 .onnx 模型文件'); return; }
    unload();
    console.info('[MosqCV] loadModel start:', file.name, file.size);
    file.arrayBuffer().then(function(buf){
      return sha256Hex(buf).then(function(hash){
        var t0 = performance.now();
        return ort.InferenceSession.create(buf, {
          executionProviders: ['webgpu', 'wasm'],
          graphOptimizationLevel: 'all'
        }).then(function(session){
          console.info('[MosqCV] session ready in', Math.round(performance.now() - t0), 'ms');
          st.session = session;
          st.purpose = purpose === 'domain' ? 'domain' : 'demo';
          st.card = {
            name: file.name, size: file.size, sha256: hash,
            input: (session.inputNames || []).join(', '),
            output: (session.outputNames || []).join(', '),
            loadMs: Math.round(performance.now() - t0)
          };
          cb(null, st.card);
        });
      });
    }).catch(function(e){
      console.error('[MosqCV] load failed:', e);
      unload();
      cb(String((e && e.message) || e));
    });
  }

  // —— 推理：640×640 拉伸 → NCHW float32 → run → NMS-free [1,300,6] 解码 ——
  // 返回 {err} 或 {n, ms, conf, boxes:[{x1,y1,x2,y2,score,cls}]}（坐标为 640 空间）
  function detect(srcImg){
    if (!st.session) return { err: 'no-model' };
    if (!proc){
      proc = document.createElement('canvas');
      proc.width = IMG; proc.height = IMG;
    }
    var pctx = proc.getContext('2d', { willReadFrequently: true });
    pctx.drawImage(srcImg, 0, 0, IMG, IMG);
    var idata = pctx.getImageData(0, 0, IMG, IMG).data;
    var N = IMG * IMG;
    var tensorData = new Float32Array(3 * N);
    var R = 0, G = N, B = 2 * N;
    for (var i = 0; i < N; i++){
      tensorData[R + i] = idata[i * 4] / 255;
      tensorData[G + i] = idata[i * 4 + 1] / 255;
      tensorData[B + i] = idata[i * 4 + 2] / 255;
    }
    var input = new ort.Tensor('float32', tensorData, [1, 3, IMG, IMG]);
    var feeds = {}; feeds[st.session.inputNames[0]] = input;
    var t0 = performance.now();
    return st.session.run(feeds).then(function(out){
      var ms = Math.round(performance.now() - t0);
      var o = out[st.session.outputNames[0]];
      var dims = o.dims, data = o.data;
      if (dims.length !== 3 || dims[2] !== 6){
        return { err: 'unsupported', dims: dims.join('×') };
      }
      var th = conf(), per = dims[2], boxes = [];
      for (var k = 0; k < dims[1]; k++){
        var x1 = data[k * per], y1 = data[k * per + 1], x2 = data[k * per + 2], y2 = data[k * per + 3];
        var score = data[k * per + 4], cls = data[k * per + 5];
        if (score < th) continue;
        boxes.push({ x1:x1, y1:y1, x2:x2, y2:y2, score:score, cls:cls });
      }
      return { n: boxes.length, ms: ms, conf: th, boxes: boxes };
    }).catch(function(e){
      return { err: String((e && e.message) || e) };
    });
  }

  return { loadModel: loadModel, unload: unload, status: status, detect: detect, conf: conf, setConf: setConf };
})();
if (typeof MosqAlgo !== 'undefined') MosqAlgo.register('mosqcv', '0.1', MosqCV);

// ================= v4.0：设置页「智能感知」区块 =================
function cvSettingsRefresh(){
  var card = document.getElementById('cv-card');
  if (!card) return;
  var s = MosqCV.status();
  var unloadBtn = document.getElementById('btn-cv-unload');
  if (unloadBtn) unloadBtn.style.display = s.loaded ? '' : 'none';
  if (!s.loaded){
    card.innerHTML = '<div class="ana-note" style="margin:0">' + tr('未加载模型') + '</div>';
    return;
  }
  var c = s.card;
  var purposeTxt = s.purpose === 'domain'
    ? T('蚊虫计数领域模型（可预填，须人工确认）', 'Mosquito-counting domain model (prefill allowed, human confirmation required)')
    : T('演示模型（COCO 通用预训练）· 计数不可入账', 'Demo model (generic COCO pre-trained) · counting cannot be recorded');
  card.innerHTML =
    '<div style="font-size:12.5px;line-height:1.8;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 12px">' +
    '<b>' + tr('当前模型') + '</b> · ' + purposeTxt + '<br>' +
    tr('文件名') + '：' + c.name + ' ｜ ' + tr('大小') + '：' + (c.size / 1048576).toFixed(1) + ' MB<br>' +
    'SHA-256：<code style="font-size:11px">' + (c.sha256 || '').slice(0, 32) + (c.sha256 && c.sha256.length > 32 ? '…' : '') + '</code><br>' +
    tr('输入') + '：' + c.input + ' ｜ ' + tr('输出') + '：' + c.output + ' ｜ ' + tr('加载耗时') + '：' + c.loadMs + ' ms' +
    '</div>';
}
function onCvModel(input){
  var f = input.files && input.files[0];
  if (!f) return;
  var purpose = document.getElementById('f-cv-purpose').value;
  var card = document.getElementById('cv-card');
  card.innerHTML = '<div class="ana-note" style="margin:0">' + tr('正在加载模型…') + '</div>';
  MosqCV.loadModel(f, purpose, function(e, c){
    if (e){ toast(T('模型加载失败：' + e, 'Model loading failed: ' + e)); }
    else { toast(T('模型已加载（' + (c.size / 1048576).toFixed(1) + ' MB）', 'Model loaded (' + (c.size / 1048576).toFixed(1) + ' MB)')); }
    input.value = '';
    cvSettingsRefresh();
  });
}
function cvUnloadModel(){
  MosqCV.unload();
  cvSettingsRefresh();
  toast(tr('已卸载模型'));
}
// —— v4.0 三期：内置演示权重一键载入（COCO 占位，计数不可入账；领域模型仍走 file 导入） ——
function loadDemoModel(cb){
  fetch('model/yolov10n-coco-demo.onnx').then(function(r){
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.arrayBuffer();
  }).then(function(buf){
    var f = new File([buf], 'yolov10n-coco-demo.onnx', { type: 'application/octet-stream' });
    MosqCV.loadModel(f, 'demo', cb);
  }).catch(function(e){
    cb(String((e && e.message) || e));
  });
}
function onCvDemoModel(){
  var sel = document.getElementById('f-cv-purpose');
  if (sel) sel.value = 'demo';
  var card = document.getElementById('cv-card');
  card.innerHTML = '<div class="ana-note" style="margin:0">' + tr('正在加载内置演示模型…') + '</div>';
  loadDemoModel(function(e, c){
    if (e){ toast(T('演示模型加载失败：' + e + '（model/yolov10n-coco-demo.onnx 缺失？）', 'Demo model loading failed: ' + e + ' (is model/yolov10n-coco-demo.onnx missing?)')); }
    else { toast(T('内置演示模型已加载（COCO 通用预训练 · 计数不可入账）', 'Built-in demo model loaded (generic COCO pre-trained · counting cannot be recorded)')); }
    cvSettingsRefresh();
  });
}
function cvConfChange(v){
  MosqCV.setConf(v);
  var el = document.getElementById('cv-conf-val');
  if (el) el.textContent = parseFloat(v).toFixed(2);
}

// ================= v4.0：蚊笼详情「照片计数」模态 =================
var cvState = { img:null, result:null };   // 照片不入库：仅模态内存态
function cvModelHint(){
  var s = MosqCV.status();
  if (!s.loaded) return tr('未加载模型：请先在侧栏「模型」页载入 .onnx 模型。');
  return T('当前模型：' + s.card.name + '（' + (s.purpose === 'domain' ? '领域模型' : '演示模型') + '）· 置信度阈值 ' + s.conf.toFixed(2),
           'Current model: ' + s.card.name + ' (' + (s.purpose === 'domain' ? 'domain' : 'demo') + ') · confidence threshold ' + s.conf.toFixed(2));
}
function openCvModal(){
  var b = getBatch(state.currentBatch);
  if (!b || b.status !== 'rearing'){ toast(tr('该蚊笼不在饲养中，记录入口已关闭')); return; }
  cvState = { img:null, result:null };
  var cv = document.getElementById('cv-canvas');
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  document.getElementById('cv-readout').textContent = '';
  document.getElementById('cv-hint').style.display = '';
  document.getElementById('cv-demo-banner').style.display = 'none';
  document.getElementById('cv-prefill').style.display = 'none';
  document.getElementById('f-cv-img').value = '';
  document.getElementById('cv-model-hint').textContent = cvModelHint();
  showModal('modal-cv');
}
function onCvImage(input){
  var f = input.files && input.files[0];
  if (!f) return;
  var img = new Image();
  img.onload = function(){
    cvState = { img: img, result: null };
    var cv = document.getElementById('cv-canvas');
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    document.getElementById('cv-hint').style.display = 'none';
    document.getElementById('cv-readout').textContent = '';
    document.getElementById('cv-demo-banner').style.display = 'none';
    document.getElementById('cv-prefill').style.display = 'none';
  };
  img.onerror = function(){ toast(tr('图片读取失败')); };
  img.src = URL.createObjectURL(f);
}
function cvClearImage(){
  cvState = { img:null, result:null };
  var cv = document.getElementById('cv-canvas');
  cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  document.getElementById('cv-readout').textContent = '';
  document.getElementById('cv-hint').style.display = '';
  document.getElementById('cv-demo-banner').style.display = 'none';
  document.getElementById('cv-prefill').style.display = 'none';
  document.getElementById('f-cv-img').value = '';
}
function runCvDetect(){
  if (!cvState.img){ toast(tr('请先导入照片')); return; }
  var s = MosqCV.status();
  if (!s.loaded){ toast(tr('未加载模型：请先在侧栏「模型」页载入 .onnx 模型。')); return; }
  var btn = document.getElementById('btn-cv-run');
  btn.disabled = true; btn.textContent = tr('识别中…');
  MosqCV.detect(cvState.img).then(function(r){
    btn.disabled = false; btn.textContent = tr('开始识别');
    var readout = document.getElementById('cv-readout');
    var banner = document.getElementById('cv-demo-banner');
    var prefill = document.getElementById('cv-prefill');
    banner.style.display = 'none'; prefill.style.display = 'none';
    if (r.err === 'no-model'){ toast(tr('未加载模型：请先在侧栏「模型」页载入 .onnx 模型。')); return; }
    if (r.err === 'unsupported'){
      toast(T('模型输出维度不受支持：' + r.dims + '（当前仅支持 YOLOv10 系 NMS-free 输出 [1,300,6]）',
              'Unsupported model output shape: ' + r.dims + ' (only YOLOv10-family NMS-free output [1,300,6] is supported)'));
      return;
    }
    if (r.err){ toast(T('识别失败：' + r.err, 'Detection failed: ' + r.err)); return; }
    cvState.result = r;
    // 叠加绘制：照片已在画布，重绘底图 + 检出框
    var cv = document.getElementById('cv-canvas');
    var ctx = cv.getContext('2d');
    ctx.drawImage(cvState.img, 0, 0, cv.width, cv.height);
    ctx.lineWidth = 2; ctx.font = '12px Consolas';
    r.boxes.forEach(function(bx){
      ctx.strokeStyle = '#333D7A'; ctx.fillStyle = 'rgba(51,61,122,.85)';
      ctx.strokeRect(bx.x1, bx.y1, bx.x2 - bx.x1, bx.y2 - bx.y1);
      ctx.fillText(bx.score.toFixed(2), bx.x1 + 2, Math.max(bx.y1 - 4, 12));
    });
    readout.textContent = T('检出 ' + r.n + ' 个目标 · 推理 ' + r.ms + ' ms · 阈值 ' + r.conf.toFixed(2),
                            'Detections: ' + r.n + ' · inference ' + r.ms + ' ms · threshold ' + r.conf.toFixed(2));
    if (s.purpose === 'demo'){
      banner.textContent = T('演示管线：当前为通用预训练模型（COCO 类别），不识别蚊虫；检出框仅用于验证识别流程，计数不可写入台账。',
                             'Demo pipeline: the current model is a generic pre-trained model (COCO classes) and does not recognise mosquitoes; boxes only validate the pipeline — the count cannot be written to the ledger.');
      banner.style.display = 'block';
    } else if (r.n > 0){
      prefill.style.display = 'block';
    } else {
      toast(T('检出为 0：低于阈值的检出不计入预填。', 'No detections: nothing above the threshold to prefill.'));
    }
  });
}
function cvPrefill(){
  var r = cvState.result, s = MosqCV.status();
  if (!r || !r.n || !s.loaded || s.purpose !== 'domain') return;
  var b = getBatch(state.currentBatch);
  var next = b ? STAGES[STAGES.indexOf(b.stage) + 1] : null;
  if (!next){ toast(tr('该蚊笼已是成虫期，无下一阶段可预填。')); return; }
  // AI 草稿元数据随记录写入台账（submitStage 消费后清空）；数量只是预填，须人工核对保存
  window.__cvPrefill = { model: (s.card.sha256 || '').slice(0, 12), conf: r.conf, det: r.n, ms: r.ms };
  closeModal();
  openRecordModal(b.id, 'stage');
  document.getElementById('f-stage-n').value = r.n;
  toast(T('已预填至「新增记录」（阶段计数）：请核对日期、数量与淘汰数后保存。',
          'Prefilled into New Record (stage count): review date, count and culls before saving.'));
}
