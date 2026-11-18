// ================= 工作台饲养柜总览（v1.3 · MosqCage3D front） =================
// 纯 SVG 正面微俯视图：柜子正对观众（去除等距 45° 倾斜），保留窄顶面提示内容物
// 场景：双柜并排 + 实验室环境元素（盆栽 / 空气净化器 / 挂式空调 / 加湿器 / 温湿度计）
// 零依赖、零网络、无渲染循环；交互：hover tooltip + 点击打开蚊笼详情；预警红点 CSS 呼吸
(function(){
'use strict';

var COLS = 4, ROWS = 4;                 // 每柜 4 列 × 4 层 = 16 格
var SLOT_W = 1.12, SLOT_D = 1.12, FLOOR_H = 1.12;   // 层高加大 → 柜体更高、笼盆更饱满
var W = COLS * SLOT_W + 0.24, D = SLOT_D + 0.34, H = ROWS * FLOOR_H + 0.30;
var S = 50;                             // 世界单位 → 像素
var K = 0.30;                           // 顶面深度压缩（微俯视角）
var CAB_GAP = 0.9;                      // 双柜间距（世界坐标）
var C1 = -2.04, C2 = C1 + W + CAB_GAP;  // 双柜中心 x（左侧留给环境柱：空调/温湿度计/衣架）
var WALL_Z = -2.05;                    // 背景墙面深度
var NS = 'http://www.w3.org/2000/svg';
var container = null, svg = null, tipEl = null;
var dataByKey = {}, lastKey = '';
var slotCache = [];                     // ci*16+idx -> 快照 | null

function tr(s){ try { return window.tr ? window.tr(s) : s; } catch(e){ return s; } }
function isEn(){ try { return LANG === 'en'; } catch(e){ return false; } }
function stageColors(){
  return window.STAGE_COLORS || {'卵期':'#94a3b8','L1期':'#93c5fd','L2期':'#60a5fa','L3期':'#38bdf8','L4期':'#0ea5e9','蛹期':'#7c3aed','成虫期':'#2563eb'};
}

// ---------- 投影与 SVG 工具 ----------
// 正面微俯：x → 屏幕横轴；y（高度）→ 屏幕纵轴；z（深度）→ 仅轻微下移（越近越低）
function P(x, y, z){ return [x * S, -y * S + z * S * K]; }
function pt(p){ return p[0].toFixed(2) + ',' + p[1].toFixed(2); }
function poly(ps){ return ps.map(pt).join(' '); }
function el(name, attrs, parent){
  var n = document.createElementNS(NS, name);
  for (var k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
// 面内局部坐标组：front=+z 正面(u→x, v→y)，top=+y 顶面(u→x, v→z)
// 在组内画 rect/圆/pattern 会随面变换，保持透视一致
function faceG(g, kind, x0, y0, z0){
  var o = P(x0, y0, z0), m;
  if (kind === 'front') m = [S, 0, 0, -S];
  else m = [S, 0, 0, S * K];
  return el('g', {transform:'matrix(' + m.join(',') + ',' + o[0].toFixed(2) + ',' + o[1].toFixed(2) + ')'}, g);
}
// 白色 pill 浮标（屏幕对齐，不随面变换）
function pill(g, cx, cy, text, fontSize, dotColor){
  var cw = isEn() ? fontSize * 0.56 : fontSize;
  var w = Math.ceil(text.length * cw) + (dotColor ? 16 : 0) + 20, h = fontSize + 10;
  var pg = el('g', {filter:'url(#mcTagShadow)'}, g);
  el('rect', {x:cx - w/2, y:cy - h/2, width:w, height:h, rx:h/2, fill:'#ffffff', stroke:'#e2e8f0', 'stroke-width':1}, pg);
  var tx = cx;
  if (dotColor){
    el('circle', {cx:cx - w/2 + 12, cy:cy, r:3.4, fill:dotColor}, pg);
    tx = cx - w/2 + 21;
    el('text', {x:tx, y:cy + fontSize*0.35, 'font-size':fontSize, 'font-weight':600, fill:'#334155'}, pg).textContent = text;
  } else {
    el('text', {x:cx, y:cy + fontSize*0.35, 'font-size':fontSize, 'font-weight':600, fill:'#334155', 'text-anchor':'middle'}, pg).textContent = text;
  }
  return pg;
}
function shadow(g, x, z, rx, ry, op){
  var c = P(x, 0, z);
  el('ellipse', {cx:c[0], cy:c[1], rx:rx, ry:ry, fill:'rgba(30,64,175,' + (op || .10) + ')'}, g);
}

// ---------- 柜体（正面） ----------
function buildCabinet(parent, xc, labelText, dotColor, ci){
  var g = el('g', {transform:'translate(' + (xc * S).toFixed(1) + ',0)'}, parent);
  var x0 = -W/2, x1 = W/2, z0 = -D/2;
  // 背板 + 通风点阵
  el('rect', {x:x0*S, y:-H*S, width:W*S, height:H*S, rx:4, fill:'#e3eaf2', stroke:'#d0dae4', 'stroke-width':1}, g);
  var vg = faceG(g, 'front', x0 + 0.12, 0.16, z0);
  el('rect', {x:0, y:0, width:W - 0.24, height:H - 0.4, fill:'url(#mcVents)'}, vg);
  // 底板
  el('rect', {x:(x0 - 0.07)*S, y:-0.10*S, width:(W + 0.14)*S, height:0.08*S, rx:2, fill:'#8296ac'}, g);
  // 层板 + 笼位（顶→底）
  for (var r = ROWS - 1; r >= 0; r--){
    var sy = 0.24 + r * FLOOR_H;
    // 层板顶面（浅）+ 正面横条
    var sTop = faceG(g, 'top', x0, sy, z0);
    el('rect', {x:0, y:0, width:W, height:D, fill:'#d7e0ea'}, sTop);
    el('rect', {x:x0*S, y:-sy*S, width:W*S, height:0.06*S, fill:'#b9c6d4'}, g);
    for (var c = 0; c < COLS; c++) buildSlot(g, ci * COLS * ROWS + r * COLS + c, sy + 0.03);
  }
  // 顶板：顶面 + 正面
  var tTop = faceG(g, 'top', x0 - 0.07, H, z0 - 0.07);
  el('rect', {x:0, y:0, width:W + 0.14, height:D + 0.14, rx:.05, fill:'#c9d4e0'}, tTop);
  el('rect', {x:(x0 - 0.07)*S, y:-H*S, width:(W + 0.14)*S, height:0.08*S, rx:2, fill:'#94a3b8'}, g);
  // 左右立柱（画在笼位之后）
  [x0, x1].forEach(function(px){
    el('rect', {x:(px - 0.045)*S, y:-H*S, width:0.09*S, height:H*S, rx:2.5, fill:'#6b7f96'}, g);
  });
  // 柜顶区域标签
  var lp = P(0, H + 0.5, 0);
  pill(g, lp[0], lp[1], labelText, 12, dotColor);
  return g;
}

// ---------- 笼位 ----------
function buildSlot(g, idx, sy){
  var r = Math.floor(idx / COLS), c = idx % COLS;
  var sx = (c - (COLS - 1) / 2) * SLOT_W;
  var b = slotCache[idx];
  var sg = el('g', {'class': b ? 'mc3d-slot' : 'mc3d-empty'}, g);
  if (b){
    sg.setAttribute('data-id', b.id);
    // 拾取热区：整格矩形（hover 高亮 + 点击）
    el('rect', {
      'class':'mc3d-hit',
      x:(sx - SLOT_W * 0.46) * S, y:-(sy + FLOOR_H * 0.85) * S,
      width:SLOT_W * 0.92 * S, height:FLOOR_H * 0.85 * S,
      'pointer-events':'all'
    }, sg);
  }
  if (!b){
    if (idx >= COLS * ROWS) buildGhostCage(sg, sx, sy);   // 成虫柜空格 = 浅色空笼占位
    else buildTray(sg, sx, sy, null, null);               // 饲养盆柜空格 = 叠放备用盆
    return;
  }
  var color = stageColors()[b.stage] || '#94a3b8';
  if (b.stage === '成虫期') buildCage(sg, sx, sy);
  else buildTray(sg, sx, sy, b, color);
  // 笼号牌
  var tp = P(sx, sy + (b.stage === '成虫期' ? 1.08 : 0.55), 0.2);
  pill(sg, tp[0], tp[1], b.id, 10, null);
  // 预警呼吸红点
  if (b.alerts){
    var ap = P(sx + 0.4, sy + (b.stage === '成虫期' ? 0.92 : 0.36), 0.25);
    el('circle', {'class':'mc3d-pulse', cx:ap[0], cy:ap[1], r:7, fill:'none', stroke:'#ef4444', 'stroke-width':1.6}, sg);
    el('circle', {cx:ap[0], cy:ap[1], r:3.8, fill:'#ef4444', stroke:'#ffffff', 'stroke-width':1.2}, sg);
  }
}

// ---------- 饲养盆（卵 / 幼虫 / 蛹 / 空格） ----------
function buildTray(g, sx, sy, b, color){
  var w = 1.0, d = 0.82, h = 0.18, x0 = sx - w/2, z0 = -d/2;
  var has = !!b;
  // 盆正面 + 盆沿
  el('rect', {x:x0*S, y:-(sy + h)*S, width:w*S, height:h*S, rx:2.5,
    fill: has ? '#eef3f8' : '#e2e9f1',
    stroke: has ? 'rgba(148,163,184,.4)' : 'rgba(100,116,139,.4)', 'stroke-width':1}, g);
  el('rect', {x:x0*S, y:-(sy + h)*S, width:w*S, height:3, fill: has ? '#dfe7ee' : '#dde5ed'}, g);
  // 顶面
  var tg = faceG(g, 'top', x0, sy + h, z0);
  if (!has){
    // 空格 = 叠放的备用洁净盆（减少柜内留白，呈收纳感）
    for (var si = 0; si < 3; si++){
      var yy = sy + si * 0.13;
      el('rect', {x:x0*S, y:-(yy + 0.11)*S, width:w*S, height:0.11*S, rx:2,
        fill:'#e6edf4', stroke:'rgba(100,116,139,.4)', 'stroke-width':1}, g);
      var stg = faceG(g, 'top', x0, yy + 0.11, z0);
      el('rect', {x:.04, y:.04, width:w - .08, height:d - .08, rx:.03, fill:'#d5dfe9'}, stg);
    }
    return;
  }
  if (b.stage === '卵期'){
    // 湿滤纸 + 卵粒点阵（顶面 y 方向压扁，ry 放大补偿）
    el('rect', {x:.06, y:.06, width:w - .12, height:d - .12, rx:.03, fill:'#eef2f6'}, tg);
    for (var i = 0; i < 16; i++){
      var ex = .14 + (i % 4) * .22 + ((i * 7) % 3) * .02;
      var ey = .14 + Math.floor(i / 4) * .16 + ((i * 5) % 3) * .02;
      el('ellipse', {cx:ex, cy:ey, rx:.02, ry:.05, fill:'#5b6b7f', opacity:.8}, tg);
    }
    return;
  }
  // 水面 = 阶段色
  el('rect', {x:.05, y:.05, width:w - .1, height:d - .1, rx:.03, fill:color, opacity:.92}, tg);
  var i2, px, py, a;
  if (b.stage === '蛹期'){
    // 浮蛹：深色逗点
    for (i2 = 0; i2 < 6; i2++){
      px = .18 + (i2 % 3) * .24 + ((i2 * 13) % 5) * .015;
      py = .22 + Math.floor(i2 / 3) * .3 + ((i2 * 7) % 3) * .02;
      a = (i2 * 47) % 360;
      var pg = el('g', {transform:'rotate(' + a + ' ' + px.toFixed(3) + ' ' + py.toFixed(3) + ')'}, tg);
      el('ellipse', {cx:px, cy:py, rx:.025, ry:.06, fill:'#45325e', opacity:.85}, pg);
    }
  } else {
    // 幼虫：弧线虫影，随龄期增大增多
    var n = {'L1期':4, 'L2期':5, 'L3期':6, 'L4期':7}[b.stage] || 5;
    var k = {'L1期':.7, 'L2期':.85, 'L3期':1, 'L4期':1.15}[b.stage] || 1;
    for (i2 = 0; i2 < n; i2++){
      px = .16 + (i2 % 3) * .26 + ((i2 * 13) % 5) * .015;
      py = .18 + Math.floor(i2 / 3) * .22 + ((i2 * 7) % 3) * .02;
      a = (i2 * 63) % 360;
      var L = .08 * k;
      el('path', {
        d:'M ' + px.toFixed(3) + ' ' + py.toFixed(3) + ' q ' + (L/2).toFixed(3) + ' ' + (.05*k).toFixed(3) + ' ' + L.toFixed(3) + ' 0 t ' + L.toFixed(3) + ' 0',
        stroke:'#1e3a5f', 'stroke-width':(.05 * k).toFixed(3), fill:'none', opacity:.62, 'stroke-linecap':'round',
        transform:'rotate(' + a + ' ' + px.toFixed(3) + ' ' + py.toFixed(3) + ')'
      }, tg);
    }
  }
}

// ---------- 成虫方形网笼（BugDorm 式，正面） ----------
function buildCage(g, sx, sy){
  var w = 0.95, d = 0.82, h = 0.92;
  var x0 = sx - w/2, z0 = -d/2, z1 = d/2;
  var yb = sy + 0.05, yt = yb + h;
  // 白色底盘（正面）
  el('rect', {x:(sx - .45)*S, y:-(sy + .05)*S, width:.9*S, height:.05*S, rx:2, fill:'#e2e8f0', stroke:'#cbd5e1', 'stroke-width':1}, g);
  // 正面网纱 + 糖水杯 + 袖口
  var fg = faceG(g, 'front', x0, yb, z1);
  el('rect', {x:0, y:0, width:w, height:h, fill:'url(#mcMesh)'}, fg);
  el('rect', {x:w - .3, y:h - .17, width:.11, height:.12, rx:.02, fill:'#fde68a', stroke:'#f59e0b', 'stroke-width':.012}, fg);
  el('circle', {cx:w/2, cy:h*.42, r:.17, fill:'#f8fafc', stroke:'#64748b', 'stroke-width':.02}, fg);
  el('circle', {cx:w/2, cy:h*.42, r:.115, fill:'#334155', opacity:.85}, fg);
  // 框边（正面）
  el('rect', {x:x0*S, y:-yt*S, width:w*S, height:h*S, fill:'none', stroke:'#3b4a5f', 'stroke-width':1.6, rx:2}, g);
  // 顶面网纱 + 框 + 提手
  var tg = faceG(g, 'top', x0, yt, z0);
  el('rect', {x:0, y:0, width:w, height:d, fill:'url(#mcMeshTop)'}, tg);
  el('rect', {x:0, y:0, width:w, height:d, fill:'none', stroke:'#3b4a5f', 'stroke-width':.022}, tg);
  el('path', {d:'M ' + (w/2 - .1) + ' ' + d/2 + ' A .1 .1 0 0 1 ' + (w/2 + .1) + ' ' + d/2,
    stroke:'#475569', 'stroke-width':.03, fill:'none'}, tg);
}

// ---------- 空笼占位（成虫柜空格：浅色网笼轮廓，减少留白） ----------
function buildGhostCage(g, sx, sy){
  var w = 0.95, d = 0.82, h = 0.92;
  var x0 = sx - w/2, z0 = -d/2, z1 = d/2;
  var yb = sy + 0.05, yt = yb + h;
  var fg = faceG(g, 'front', x0, yb, z1);
  el('rect', {x:0, y:0, width:w, height:h, fill:'url(#mcMesh)', opacity:.32}, fg);
  el('rect', {x:x0*S, y:-yt*S, width:w*S, height:h*S, fill:'none', stroke:'#b9c6d4', 'stroke-width':1.1, rx:2}, g);
  var tg = faceG(g, 'top', x0, yt, z0);
  el('rect', {x:0, y:0, width:w, height:d, fill:'url(#mcMeshTop)', opacity:.3}, tg);
  el('rect', {x:0, y:0, width:w, height:d, fill:'none', stroke:'#b9c6d4', 'stroke-width':.018}, tg);
}

// ---------- 环境元素 ----------
// 盆栽：梯形盆 + 丛叶
function buildPlant(parent, x, z, s, baseY, noShadow){
  var g = el('g', {}, parent);
  var by = baseY || 0;
  if (!noShadow) shadow(parent, x, z, .42 * s * S, .12 * s * S, .10);
  var pw = 0.19 * s, pb = 0.125 * s, ph = 0.3 * s;
  // 盆（梯形）+ 盆沿
  el('polygon', {points:poly([
    P(x - pw, by, z), P(x + pw, by, z), P(x + pb, by + ph, z), P(x - pb, by + ph, z)
  ]), fill:'#e9dcc8', stroke:'#cbb9a0', 'stroke-width':1}, g);
  var rimY = P(x, by + ph, z)[1];
  el('rect', {x:(x - pw - 0.015)*S, y:rimY - 2.5, width:(2 * pw + 0.03)*S, height:5, rx:2.5, fill:'#dcc9ab'}, g);
  // 丛叶（中心对称五片，绿色三档）
  var mouth = P(x, by + ph, z);
  var leaves = [
    {a:-55, l:.50, c:'#3f9268'}, {a:-26, l:.60, c:'#5db37e'},
    {a:0, l:.68, c:'#7ccd9a'},
    {a:26, l:.60, c:'#5db37e'}, {a:55, l:.50, c:'#3f9268'}
  ];
  leaves.forEach(function(L){
    var lg = el('g', {transform:'translate(' + mouth[0].toFixed(1) + ',' + mouth[1].toFixed(1) + ') rotate(' + L.a + ')'}, g);
    var rl = L.l * s * S;
    el('ellipse', {cx:0, cy:-rl/2, rx:.075 * s * S, ry:rl/2, fill:L.c}, lg);
    el('line', {x1:0, y1:0, x2:0, y2:-rl, stroke:'#2f7a55', 'stroke-width':1, opacity:.35}, lg);
  });
  return g;
}
// 立式空气净化器
function buildPurifier(parent, x, z){
  var g = el('g', {}, parent);
  shadow(parent, x, z, .30 * S, .09 * S, .10);
  var w = 0.21, h = 1.02;
  var b = P(x - w, 0, z);
  var bx = b[0], by = b[1], wpx = 2 * w * S, hpx = h * S;
  el('rect', {x:bx, y:by - hpx, width:wpx, height:hpx, rx:10, fill:'#f8fafc', stroke:'#cbd5e1', 'stroke-width':1.3}, g);
  for (var i = 0; i < 5; i++){
    el('line', {x1:bx + 7, y1:by - hpx + 14 + i * 5.5, x2:bx + wpx - 7, y2:by - hpx + 14 + i * 5.5, stroke:'#cbd5e1', 'stroke-width':1.4}, g);
  }
  var ccx = bx + wpx / 2, ccy = by - hpx * 0.42;
  el('circle', {cx:ccx, cy:ccy, r:8, fill:'#0f172a'}, g);
  el('circle', {cx:ccx, cy:ccy, r:2.6, fill:'#34d399'}, g);
  el('line', {x1:bx + 7, y1:by - 10, x2:bx + wpx - 7, y2:by - 10, stroke:'#cbd5e1', 'stroke-width':1.4}, g);
  el('line', {x1:bx + 7, y1:by - 5, x2:bx + wpx - 7, y2:by - 5, stroke:'#cbd5e1', 'stroke-width':1.4}, g);
  return g;
}
// 加湿器（顶部喷雾）
function buildHumidifier(parent, x, z){
  var g = el('g', {}, parent);
  shadow(parent, x, z, .22 * S, .08 * S, .10);
  var w = 0.16, h = 0.46;
  var b = P(x - w, 0, z);
  var bx = b[0], by = b[1], wpx = 2 * w * S, hpx = h * S;
  var top = by - hpx;
  // 雾团（三团渐升渐淡）
  [{dy:10, r:6, o:.85}, {dy:22, r:9, o:.6}, {dy:36, r:12, o:.4}].forEach(function(m){
    el('circle', {cx:bx + wpx/2, cy:top - m.dy, r:m.r, fill:'#e6eef8', stroke:'#c9d8ea', 'stroke-width':1, opacity:m.o}, g);
  });
  el('rect', {x:bx, y:top, width:wpx, height:hpx, rx:11, fill:'#f8fafc', stroke:'#cbd5e1', 'stroke-width':1.3}, g);
  el('rect', {x:bx + 5, y:top + 3, width:wpx - 10, height:5, rx:2.5, fill:'#e2e8f0'}, g);
  el('rect', {x:bx + 6, y:top + hpx * 0.42, width:6, height:hpx * 0.42, rx:3, fill:'#bfdbfe'}, g);
  el('circle', {cx:bx + wpx - 10, cy:top + hpx * 0.55, r:2, fill:'#60a5fa'}, g);
  return g;
}
// 挂式空调（背景高处）
function buildAC(parent, x, y, z){
  var g = el('g', {}, parent);
  var w = 1.1, h = 0.30;
  var c = P(x, y, z);
  var bx = c[0] - w * S, by = c[1] - h * S, wpx = 2 * w * S, hpx = 2 * h * S;
  // 机身
  el('rect', {x:bx, y:by, width:wpx, height:hpx, rx:10, fill:'#f8fafc', stroke:'#cbd5e1', 'stroke-width':1.3}, g);
  // 顶部进风格栅
  for (var i = 0; i < 3; i++){
    el('line', {x1:bx + 12, y1:by + 8 + i * 4.5, x2:bx + wpx - 12, y2:by + 8 + i * 4.5, stroke:'#cbd5e1', 'stroke-width':1.3}, g);
  }
  // 品牌饰条（左侧浅蓝）
  el('rect', {x:bx + 10, y:by + hpx * 0.42, width:14, height:5, rx:2.5, fill:'#bfdbfe'}, g);
  // 底部出风口：深色横缝 + 前导风板
  el('rect', {x:bx + 12, y:by + hpx - 9, width:wpx - 24, height:4, rx:2, fill:'#94a3b8'}, g);
  el('rect', {x:bx + 10, y:by + hpx - 4, width:wpx - 20, height:3, rx:1.5, fill:'#cbd5e1'}, g);
  // 指示灯
  el('circle', {cx:bx + wpx - 9, cy:by + hpx / 2, r:2.4, fill:'#34d399'}, g);
  // 下方微风弧线
  el('path', {d:'M ' + (bx + wpx*0.3) + ' ' + (by + hpx + 5) + ' q 8 9 0 16', stroke:'#b9cbe0', 'stroke-width':1.6, fill:'none', opacity:.8}, g);
  el('path', {d:'M ' + (bx + wpx*0.52) + ' ' + (by + hpx + 7) + ' q 7 7 0 13', stroke:'#b9cbe0', 'stroke-width':1.6, fill:'none', opacity:.6}, g);
  el('path', {d:'M ' + (bx + wpx*0.72) + ' ' + (by + hpx + 5) + ' q 6 6 0 11', stroke:'#b9cbe0', 'stroke-width':1.6, fill:'none', opacity:.45}, g);
  return g;
}
// 挂墙温湿度计
function buildThermo(parent, x, y, z){
  var g = el('g', {}, parent);
  var w = 0.42, h = 0.24;
  var c = P(x, y, z);
  var bx = c[0] - w * S, by = c[1] - h * S, wpx = 2 * w * S, hpx = 2 * h * S;
  el('rect', {x:bx, y:by, width:wpx, height:hpx, rx:6, fill:'#ffffff', stroke:'#cbd5e1', 'stroke-width':1.2}, g);
  el('rect', {x:bx + 3, y:by + 3, width:wpx - 6, height:hpx - 6, rx:4, fill:'#f1f5f9'}, g);
  el('text', {x:c[0], y:by + hpx/2 - 1, 'font-size':10, 'font-weight':600, fill:'#0f172a', 'text-anchor':'middle'}, g).textContent = '27.5°C';
  el('text', {x:c[0], y:by + hpx - 6, 'font-size':8.5, fill:'#64748b', 'text-anchor':'middle'}, g).textContent = 'RH 78%';
  return g;
}

// 落地衣架 + 白大褂（左侧环境柱）
function buildCoatRack(parent, x, z){
  var g = el('g', {}, parent);
  shadow(parent, x, z, .62 * S, .10 * S, .10);
  var barY = 3.15, xl = x - 0.62, xr = x + 0.62;
  // 立杆 + 脚
  [xl, xr].forEach(function(px){
    var a = P(px, 0, z), b = P(px, barY, z);
    el('line', {x1:a[0], y1:a[1], x2:b[0], y2:b[1], stroke:'#94a3b8', 'stroke-width':3, 'stroke-linecap':'round'}, g);
    el('line', {x1:a[0] - 11, y1:a[1], x2:a[0] + 11, y2:a[1], stroke:'#94a3b8', 'stroke-width':3, 'stroke-linecap':'round'}, g);
  });
  // 横杆
  var ba = P(xl, barY, z), bb = P(xr, barY, z);
  el('line', {x1:ba[0], y1:ba[1], x2:bb[0], y2:bb[1], stroke:'#6b7f96', 'stroke-width':3.5, 'stroke-linecap':'round'}, g);
  // 右侧空衣架
  var hx = P(x + 0.4, barY, z)[0], hy = ba[1];
  el('path', {d:'M ' + hx + ' ' + (hy + 2) + ' q 4 -5 0 -8', stroke:'#94a3b8', 'stroke-width':1.6, fill:'none'}, g);
  el('path', {d:'M ' + (hx - 14) + ' ' + (hy + 16) + ' L ' + hx + ' ' + (hy + 5) + ' L ' + (hx + 14) + ' ' + (hy + 16) + ' Z',
    stroke:'#94a3b8', 'stroke-width':1.6, fill:'none', 'stroke-linejoin':'round'}, g);
  // 白大褂（挂钩 + 衣身）
  var cx = P(x - 0.16, 0, z)[0], ty = P(0, 3.0, z)[1];
  el('path', {d:'M ' + cx + ' ' + (ty + 1) + ' q 5 -6 0 -11', stroke:'#64748b', 'stroke-width':1.6, fill:'none'}, g);
  el('path', {d:
    'M ' + (cx - 26) + ' ' + (ty + 10) +
    ' Q ' + (cx - 24) + ' ' + (ty + 2) + ' ' + (cx - 14) + ' ' + ty +
    ' L ' + (cx - 4) + ' ' + (ty + 6) + ' L ' + cx + ' ' + (ty + 12) +
    ' L ' + (cx + 4) + ' ' + (ty + 6) + ' L ' + (cx + 14) + ' ' + ty +
    ' Q ' + (cx + 24) + ' ' + (ty + 2) + ' ' + (cx + 26) + ' ' + (ty + 10) +
    ' L ' + (cx + 30) + ' ' + (ty + 70) + ' L ' + (cx + 20) + ' ' + (ty + 72) +
    ' L ' + (cx + 18) + ' ' + (ty + 40) + ' L ' + (cx + 16) + ' ' + (ty + 92) +
    ' L ' + (cx - 16) + ' ' + (ty + 92) + ' L ' + (cx - 18) + ' ' + (ty + 40) +
    ' L ' + (cx - 20) + ' ' + (ty + 72) + ' L ' + (cx - 30) + ' ' + (ty + 70) + ' Z',
    fill:'#f8fafc', stroke:'#cbd5e1', 'stroke-width':1.3, 'stroke-linejoin':'round'}, g);
  // 门襟 + 领口 + 口袋 + 纽扣
  el('line', {x1:cx, y1:ty + 12, x2:cx, y2:ty + 92, stroke:'#cbd5e1', 'stroke-width':1.2}, g);
  el('path', {d:'M ' + (cx - 4) + ' ' + (ty + 6) + ' L ' + (cx - 9) + ' ' + (ty + 16) + ' L ' + cx + ' ' + (ty + 12) + ' Z', fill:'#e2e8f0'}, g);
  el('path', {d:'M ' + (cx + 4) + ' ' + (ty + 6) + ' L ' + (cx + 9) + ' ' + (ty + 16) + ' L ' + cx + ' ' + (ty + 12) + ' Z', fill:'#e2e8f0'}, g);
  el('rect', {x:cx - 13, y:ty + 60, width:9, height:10, rx:1.5, fill:'none', stroke:'#cbd5e1', 'stroke-width':1.1}, g);
  el('rect', {x:cx + 4, y:ty + 60, width:9, height:10, rx:1.5, fill:'none', stroke:'#cbd5e1', 'stroke-width':1.1}, g);
  el('circle', {cx:cx + 3, cy:ty + 30, r:1.2, fill:'#94a3b8'}, g);
  el('circle', {cx:cx + 3, cy:ty + 46, r:1.2, fill:'#94a3b8'}, g);
  return g;
}

// ---------- 场景构建 ----------
function build(rearing, strains, openAlerts){
  if (svg) svg.remove();
  var sorted = rearing.slice().sort(function(a, b){ return a.id < b.id ? -1 : 1; });
  var trays = sorted.filter(function(b){ return b.stage !== '成虫期'; });
  var adults = sorted.filter(function(b){ return b.stage === '成虫期'; });
  dataByKey = {};
  function snapshot(list, ci){
    for (var idx = 0; idx < COLS * ROWS; idx++){
      var b = list[idx];
      slotCache[ci * COLS * ROWS + idx] = null;
      if (!b) continue;
      var my = openAlerts.filter(function(a){ return a.batch === b.id; });
      var s = strains && strains[b.strain];
      var d = {
        id:b.id, stage:b.stage, count:b.count, gen:b.gen, alerts:my.length,
        strainName: s ? (isEn() && s.name_en ? s.name_en : s.name) : b.strain,
        latin: s ? s.latin : ''
      };
      dataByKey[b.id] = d;
      slotCache[ci * COLS * ROWS + idx] = d;
    }
  }
  snapshot(trays, 0); snapshot(adults, 1);

  // 取景 bounds（左：空调/温湿度计/衣架柱；右：加高双柜 + 净化器/盆栽）
  var minX = -352, maxX = 372, minY = -296, maxY = 40;
  var vbW = maxX - minX, vbH = maxY - minY;
  svg = el('svg', {
    viewBox:minX + ' ' + minY + ' ' + vbW + ' ' + vbH,
    preserveAspectRatio:'xMidYMid meet',
    style:'font-family:"Segoe UI","Microsoft YaHei",-apple-system,sans-serif'
  });
  var defs = el('defs', {}, svg);
  var bg = el('linearGradient', {id:'mcBg', gradientUnits:'userSpaceOnUse', x1:0, y1:minY, x2:0, y2:maxY}, defs);
  el('stop', {offset:'0%', 'stop-color':'#f7f9fc'}, bg);
  el('stop', {offset:'100%', 'stop-color':'#edf1f7'}, bg);
  var dp = el('pattern', {id:'mcDots', width:26, height:26, patternUnits:'userSpaceOnUse'}, defs);
  el('circle', {cx:1.3, cy:1.3, r:1.1, fill:'#d8e1eb'}, dp);
  var sh = el('radialGradient', {id:'mcShadow'}, defs);
  el('stop', {offset:'0%', 'stop-color':'rgba(30,64,175,.16)'}, sh);
  el('stop', {offset:'70%', 'stop-color':'rgba(30,64,175,.07)'}, sh);
  el('stop', {offset:'100%', 'stop-color':'rgba(30,64,175,0)'}, sh);
  var mp = el('pattern', {id:'mcMesh', width:.085, height:.085, patternUnits:'userSpaceOnUse'}, defs);
  el('rect', {width:.085, height:.085, fill:'rgba(37,99,235,.13)'}, mp);
  el('path', {d:'M .085 0 L 0 0 0 .085', fill:'none', stroke:'rgba(37,99,235,.4)', 'stroke-width':.012}, mp);
  var mt = el('pattern', {id:'mcMeshTop', width:.13, height:.13, patternUnits:'userSpaceOnUse'}, defs);
  el('rect', {width:.13, height:.13, fill:'rgba(37,99,235,.11)'}, mt);
  el('path', {d:'M .13 0 L 0 0 0 .13', fill:'none', stroke:'rgba(37,99,235,.36)', 'stroke-width':.014}, mt);
  var vp = el('pattern', {id:'mcVents', width:.26, height:.26, patternUnits:'userSpaceOnUse'}, defs);
  el('circle', {cx:.13, cy:.13, r:.022, fill:'#c3cfdb'}, vp);
  var fl = el('filter', {id:'mcTagShadow', x:'-30%', y:'-30%', width:'160%', height:'180%'}, defs);
  el('feDropShadow', {dx:0, dy:1, stdDeviation:1.2, 'flood-color':'#0f172a', 'flood-opacity':.16}, fl);

  // 墙面 + 地板（微俯：墙底线随深度上移）
  var wallBase = WALL_Z * S * K;
  el('rect', {x:minX - 3000, y:minY - 3000, width:vbW + 6000, height:(wallBase - minY) + 3000, fill:'url(#mcBg)'}, svg);
  el('rect', {x:minX - 3000, y:minY - 3000, width:vbW + 6000, height:(wallBase - minY) + 3000, fill:'url(#mcDots)', opacity:.5}, svg);
  el('rect', {x:minX - 3000, y:wallBase - 7, width:vbW + 6000, height:7, fill:'#cdd8e3'}, svg);   // 踢脚线
  el('rect', {x:minX - 3000, y:wallBase, width:vbW + 6000, height:maxY - wallBase + 3000, fill:'#e0e7ef'}, svg);
  el('ellipse', {cx:0, cy:24, rx:vbW * .55, ry:34, fill:'rgba(30,64,175,.05)'}, svg);             // 地板光斑

  // 左侧环境柱：空调（左上）→ 温湿度计（空调下方）→ 衣架白大褂（落地）
  buildAC(svg, -5.8, 4.95, WALL_Z + 0.05);
  buildThermo(svg, -5.8, 3.95, WALL_Z + 0.05);
  buildCoatRack(svg, -5.8, 0.6);

  // 柜底软阴影 → 双柜（右移、加高）
  shadow(svg, C1, 0.35, W/2 * S * 1.08, 24, .11);
  shadow(svg, C2, 0.35, W/2 * S * 1.08, 24, .11);
  buildCabinet(svg, C1, tr('饲养盆区'), '#38bdf8', 0);
  buildCabinet(svg, C2, tr('成虫笼区'), '#2563eb', 1);

  // 地面环境元素：加湿器置于双柜间缝，盆栽+净化器居右
  buildHumidifier(svg, (C1 + C2) / 2, 1.05);
  buildPlant(svg, 6.5, 1.0, 1.18);
  buildPurifier(svg, 7.15, 1.0);
  // 柜顶小盆栽（左右柜外角）
  buildPlant(svg, C1 - W/2 + 0.55, 0.1, 0.5, H + 0.05, true);
  buildPlant(svg, C2 + W/2 - 0.55, 0.1, 0.5, H + 0.05, true);

  container.appendChild(svg);
}

// ---------- 图例 ----------
function renderLegend(rearing, hasAlerts){
  var lg = document.getElementById('cage3d-legend');
  if (!lg) return;
  var colors = stageColors(), used = {};
  rearing.forEach(function(b){ used[b.stage] = 1; });
  var stages = ['卵期','L1期','L2期','L3期','L4期','蛹期','成虫期'].filter(function(s){ return used[s]; });
  lg.innerHTML = stages.map(function(s){
    return '<span class="lg3d"><span class="dot3d" style="background:' + colors[s] + '"></span>' + tr(s) + '</span>';
  }).join('') + (hasAlerts ? '<span class="lg3d"><span class="dot3d alert"></span>' + tr('预警') + '</span>' : '');
}

// ---------- 数据同步 ----------
function sync(rearing, strains, alerts){
  container = document.getElementById('cage3d-wrap');
  if (!container) return;
  var open = (alerts || []).filter(function(a){ return a.state === 'open'; });
  var key = JSON.stringify(rearing.map(function(b){ return [b.id, b.stage, b.count]; })) + '#' +
    open.map(function(a){ return a.batch + a.type; }).sort().join(',') + '#' + (isEn() ? 'en' : 'zh');
  if (key === lastKey && svg) return;
  lastKey = key;
  build(rearing, strains, open);
  renderLegend(rearing, open.length > 0);
}

// ---------- 交互：hover tooltip + 点击查看 ----------
function ensureTip(){
  if (tipEl) return;
  tipEl = document.createElement('div');
  tipEl.className = 'mc3d-tip';
  container.appendChild(tipEl);
  container.addEventListener('mousemove', onMove);
  container.addEventListener('mouseleave', hideTip);
  container.addEventListener('click', onClick);
}
function slotOf(e){
  var t = e.target;
  return t && t.closest ? t.closest('.mc3d-slot') : null;
}
function onMove(e){
  var s = slotOf(e);
  if (!s){ hideTip(); return; }
  var d = dataByKey[s.getAttribute('data-id')];
  if (!d){ hideTip(); return; }
  var head = '<b>' + d.id + '</b>' + (d.strainName ? ' · ' + d.strainName : '') +
    (d.latin ? ' <i style="opacity:.7">' + d.latin + '</i>' : '');
  var sub = tr(d.stage) + (d.gen ? ' · ' + d.gen : '') + ' · ' + (isEn() ? (d.count + ' mosquitoes') : (d.count + ' 只'));
  if (d.alerts) sub += ' · <span style="color:#fca5a5">⚠ ' + tr('预警') + ' ×' + d.alerts + '</span>';
  tipEl.innerHTML = '<div>' + head + '</div><div style="opacity:.85">' + sub + '</div>' +
    '<div style="opacity:.5;font-size:11px;margin-top:2px">' + tr('点击查看蚊笼详情') + '</div>';
  tipEl.style.display = 'block';
  var rect = container.getBoundingClientRect();
  var x = e.clientX - rect.left + 14, y = e.clientY - rect.top + 12;
  x = Math.max(4, Math.min(x, rect.width - tipEl.offsetWidth - 8));
  y = Math.max(4, Math.min(y, rect.height - tipEl.offsetHeight - 8));
  tipEl.style.left = x + 'px';
  tipEl.style.top = y + 'px';
}
function hideTip(){ if (tipEl) tipEl.style.display = 'none'; }
function onClick(e){
  var s = slotOf(e);
  if (s && typeof window.openBatch === 'function') window.openBatch(s.getAttribute('data-id'));
}

window.MC3D = {
  sync: function(rearing, strains, alerts){
    try {
      sync(rearing, strains, alerts);
      ensureTip();
    } catch(e){ console.warn('[MC3D]', e); }
  },
  resize: function(){ /* SVG viewBox 自适应容器，无需重算 */ },
  version: 'MosqCage3D v1.3 · front'
};
})();
