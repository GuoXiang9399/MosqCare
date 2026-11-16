// ================= MosqCare v3.6 标签打印：纯 JS QR 编码器 =================
// 零依赖离线实现（字节模式、EC 级 M、版本 1–6 自动选择、Reed-Solomon、自动掩码）。
// MCQR.svg(text, px) 返回内联 SVG 字符串；MCQR.make(text) 返回 {size, modules}。
var MCQR = (function(){
  // GF(256)，本原多项式 0x11D
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function(){
    var x = 1;
    for (var i = 0; i < 255; i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11D; }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();
  function gmul(a, b){ return (a && b) ? EXP[(LOG[a] + LOG[b]) % 255] : 0; }
  function rsGen(nEc){
    var g = [1];
    for (var i = 0; i < nEc; i++){
      var ng = new Array(g.length + 1).fill(0);
      for (var j = 0; j < g.length; j++){ ng[j] ^= g[j]; ng[j + 1] ^= gmul(g[j], EXP[i]); }
      g = ng;
    }
    return g;
  }
  function rsEc(data, nEc){
    var gen = rsGen(nEc), res = new Array(nEc).fill(0);
    data.forEach(function(b){
      var f = b ^ res[0];
      res.shift(); res.push(0);
      if (f) for (var i = 0; i < nEc; i++) res[i] ^= gmul(gen[i + 1], f);
    });
    return res;
  }
  // EC 级 M、版本 1–6：均为等长数据块（v4/v5 两块、v6 四块）
  // [版本, 总码字, 每块数据码字, 块数, 对齐坐标表, 字节容量]
  var SPEC = [
    [1, 26,  16, 1, [],      14],
    [2, 44,  28, 1, [6, 18], 26],
    [3, 70,  44, 1, [6, 22], 42],
    [4, 100, 32, 2, [6, 26], 62],
    [5, 134, 43, 2, [6, 30], 84],
    [6, 172, 27, 4, [6, 34], 106]
  ];
  function pickVersion(len){
    for (var i = 0; i < SPEC.length; i++) if (len <= SPEC[i][5]) return SPEC[i];
    return null;
  }
  function make(text){
    var bytes = [];
    String(text).split('').forEach(function(ch){
      var c = ch.codePointAt(0);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else bytes.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    });
    var spec = pickVersion(bytes.length);
    if (!spec) return null;
    var totalCw = spec[1], dataCw = spec[2], nBlocks = spec[3];
    var nEc = totalCw / nBlocks - dataCw;
    // 数据段：模式 0100 + 8 位字符数 + 数据 + 终止符 + 补齐到码字边界
    var bits = [];
    function put(v, n){ for (var i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); }
    put(4, 4); put(bytes.length, 8);
    bytes.forEach(function(b){ put(b, 8); });
    var capBits = dataCw * 8;
    put(0, Math.min(4, capBits - bits.length));
    while (bits.length % 8) put(0, 1);
    var cw = [];
    for (var i = 0; i < bits.length; i += 8){
      var b0 = 0; for (var k = 0; k < 8; k++) b0 = (b0 << 1) | bits[i + k];
      cw.push(b0);
    }
    var pads = [0xEC, 0x11], p = 0;
    while (cw.length < dataCw) cw.push(pads[p++ % 2]);
    // 分块 → 各块 RS → 交织
    var per = dataCw / nBlocks, blocks = [], ecAll = [];
    for (var bi = 0; bi < nBlocks; bi++){
      var chunk = cw.slice(bi * per, (bi + 1) * per);
      blocks.push(chunk); ecAll.push(rsEc(chunk, nEc));
    }
    var seq = [];
    for (var di = 0; di < per; di++) for (var bj = 0; bj < nBlocks; bj++) seq.push(blocks[bj][di]);
    for (var ei = 0; ei < nEc; ei++) for (var bk = 0; bk < nBlocks; bk++) seq.push(ecAll[bk][ei]);
    return build(spec[0], spec[4], seq);
  }
  function build(v, align, seq){
    var n = v * 4 + 17, m = [];
    for (var r0 = 0; r0 < n; r0++) m.push(new Array(n).fill(null));
    // 寻像图形 + 分隔
    function finder(cx, cy){
      for (var dy = -1; dy <= 7; dy++) for (var dx = -1; dx <= 7; dx++){
        var x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        var ring = (dx >= 0 && dx <= 6 && (dx === 0 || dx === 6)) || (dy >= 0 && dy <= 6 && (dy === 0 || dy === 6)) || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
        m[y][x] = ring ? 1 : 0;
      }
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    // 时序图形
    for (var i = 8; i < n - 8; i++){ m[6][i] = (i % 2 === 0) ? 1 : 0; m[i][6] = (i % 2 === 0) ? 1 : 0; }
    // 对齐图形（避开寻像区）
    align.forEach(function(ay){
      align.forEach(function(ax){
        if ((ax <= 8 && ay <= 8) || (ax >= n - 9 && ay <= 8) || (ax <= 8 && ay >= n - 9)) return;
        for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++){
          m[ay + dy][ax + dx] = (Math.max(Math.abs(dx), Math.abs(dy)) !== 1) ? 1 : 0;
        }
      });
    });
    // 预留格式信息区（置 0，最终由 placeFormat 覆写）
    [0, 1, 2, 3, 4, 5, 7, 8].forEach(function(c){ m[8][c] = 0; });        // 左上横段（(8,6) 为时序）
    [0, 1, 2, 3, 4, 5, 7].forEach(function(r){ m[r][8] = 0; });           // 左上纵段（(6,8) 为时序）
    for (var f1 = 0; f1 < 8; f1++) m[8][n - 1 - f1] = 0;                  // 右上
    for (var f2 = 1; f2 <= 7; f2++) m[n - f2][8] = 0;                     // 左下
    m[n - 8][8] = 1;                                                       // 暗模块
    // 数据布置：右下起双列蛇形，跳过时序列
    var bitIdx = 0, up = true;
    for (var col2 = n - 1; col2 > 0; col2 -= 2){
      if (col2 === 6) col2--;
      for (var t = 0; t < n; t++){
        var row = up ? n - 1 - t : t;
        for (var c = 0; c < 2; c++){
          var x = col2 - c;
          if (m[row][x] === null){
            var bit = 0;
            if (bitIdx < seq.length * 8){
              bit = (seq[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            }
            m[row][x] = bit; bitIdx++;
          }
        }
      }
      up = !up;
    }
    // 功能区判定（掩码跳过：寻像/分隔/时序/对齐/格式/暗模块）
    function isFunc(r, c){
      if (r === 6 || c === 6) return true;
      if (r <= 8 && c <= 8) return true;
      if (r <= 8 && c >= n - 9) return true;
      if (r >= n - 9 && c <= 8) return true;
      for (var a = 0; a < align.length; a++) for (var b = 0; b < align.length; b++){
        if (Math.abs(r - align[b]) <= 2 && Math.abs(c - align[a]) <= 2) return true;
      }
      return false;
    }
    function maskFn(k, r, c){
      switch(k){
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
        case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
        default: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
      }
    }
    function applyMask(k){
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++){
        if (m[r][c] === null || isFunc(r, c)) continue;
        if (maskFn(k, r, c)) m[r][c] ^= 1;
      }
    }
    function score(){
      var pen = 0, dark = 0, r, c;
      // N1：行 / 列同色游程 ≥5
      for (r = 0; r < n; r++){
        var run = 1;
        for (c = 1; c < n; c++){
          if (m[r][c] === m[r][c - 1]){ run++; if (c === n - 1 && run >= 5) pen += 3 + (run - 5); }
          else { if (run >= 5) pen += 3 + (run - 5); run = 1; }
        }
      }
      for (c = 0; c < n; c++){
        var run2 = 1;
        for (r = 1; r < n; r++){
          if (m[r][c] === m[r - 1][c]){ run2++; if (r === n - 1 && run2 >= 5) pen += 3 + (run2 - 5); }
          else { if (run2 >= 5) pen += 3 + (run2 - 5); run2 = 1; }
        }
      }
      // N2：同色 2×2 块
      for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++){
        var v0 = m[r][c] ? 1 : 0;
        if ((m[r][c + 1] ? 1 : 0) === v0 && (m[r + 1][c] ? 1 : 0) === v0 && (m[r + 1][c + 1] ? 1 : 0) === v0) pen += 3;
      }
      // N3：1:1:3:1:1 定位比率图样（含单侧 4 明模块，正反两向）
      var pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], rev = pat.slice().reverse();
      function lineHit(get, len){
        for (var s = 0; s <= len - 11; s++){
          var hitF = true, hitR = true;
          for (var q = 0; q < 11; q++){
            var v1 = get(s + q) ? 1 : 0;
            if (v1 !== pat[q]) hitF = false;
            if (v1 !== rev[q]) hitR = false;
            if (!hitF && !hitR) break;
          }
          if (hitF || hitR) pen += 40;
        }
      }
      for (r = 0; r < n; r++) lineHit(function(x){ return m[r][x]; }, n);
      for (c = 0; c < n; c++) lineHit(function(x){ return m[x][c]; }, n);
      // N4：明暗比例偏离 50%
      for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (m[r][c]) dark++;
      var pct = dark * 100 / (n * n);
      pen += Math.floor(Math.abs(pct - 50) / 5) * 10;
      return pen;
    }
    // 格式信息：EC 级 M(00) + 掩码 3 位 → BCH(15,5) → 异或 0x5412
    function fmtBits(k){
      var d = k, g = 0x537, f = d << 10;
      for (var i = 14; i >= 10; i--) if ((f >> i) & 1) f ^= g << (i - 10);
      return (((d << 10) | f) ^ 0x5412) & 0x7FFF;
    }
    function placeFormat(k){
      var bits = fmtBits(k), i, j;
      for (i = 0; i < 15; i++){ // 第一份：围绕左上寻像区
        var bit = (bits >> i) & 1;
        if (i < 6) m[8][i] = bit;
        else if (i === 6) m[8][7] = bit;
        else if (i === 7) m[8][8] = bit;
        else if (i === 8) m[7][8] = bit;
        else m[14 - i][8] = bit;
      }
      for (j = 0; j < 15; j++){ // 第二份：右上横段 + 左下纵段
        var bit2 = (bits >> j) & 1;
        if (j < 8) m[8][n - 1 - j] = bit2;
        else m[n - 15 + j][8] = bit2;
      }
      m[n - 8][8] = 1; // 暗模块复位
    }
    var best = 0, bestScore = Infinity;
    for (var k = 0; k < 8; k++){
      var backup = m.map(function(row){ return row.slice(); });
      applyMask(k); placeFormat(k);
      var sc = score();
      if (sc < bestScore){ bestScore = sc; best = k; }
      m = backup;
    }
    applyMask(best); placeFormat(best);
    return {size: n, modules: m, mask: best, version: v};
  }
  function svg(text, px){
    var q = make(text);
    if (!q) return '<span style="font-size:12px;color:#94a3b8">QR 载荷过长</span>';
    var s = q.size, quiet = 4, w = s + quiet * 2, path = '';
    for (var r = 0; r < s; r++) for (var c = 0; c < s; c++){
      if (q.modules[r][c]) path += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
    }
    var size = px || 96;
    return '<svg viewBox="0 0 ' + w + ' ' + w + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" style="display:block">' +
      '<rect width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + path + '" fill="#111827"/></svg>';
  }
  return {make: make, svg: svg};
})();
