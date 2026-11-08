// ================= MosqActivity v0.1 算法核心（v2.1 迁出为独立模块，无 DOM 依赖） =================
/* ---------- MosqActivity v0.1 算法核心（自 MosqCare-ActivityLab 移植，无 DOM 依赖） ----------
 * 接口：var algo = new MosqActivity(w, h);
 *       algo.processFrame(gray /*Uint8Array w*h*​/, tSec) → {energy, count, th, status}
 *       algo.pullSecond() → {t, ai, cnt, aiS} | null （每秒一条聚合样本）
 *       algo.mask → 运动掩膜（2=活动像素，叠加显示用）                                        */
function MosqActivity(w, h){
  this.w = w; this.h = h; this.n = w * h;
  this.bg = new Float32Array(this.n);      // 背景模型（σ 估计与守卫）
  this.prev = new Uint8Array(this.n);      // 上一帧灰度（帧间差分）
  this.dbuf = new Float32Array(this.n);    // 背景差分缓存
  this.mask = new Uint8Array(this.n);      // 活动掩膜（显示用）
  this.er = new Uint8Array(this.n);        // 腐蚀缓存
  this.tmp = new Uint8Array(this.n);       // 膨胀/CC 工作缓存
  this.stack = new Int32Array(this.n);     // 连通域队列
  this.samp = new Float32Array(4096);      // σ 采样缓存
  this.areas = [];                         // 当前帧活动斑块面积
  this.initialized = false;
  this.sigma = 4;                          // 噪声σ EMA
  this.typical = 0;                        // 单虫典型活动斑块面积（由每帧最小斑块自标定）
  this.aiS = null;                         // 平滑 AI
  this.secOut = null;
  this.acc = {t:-1, e:0, c:0, n:0, roiN:this.n};
  this.status = 'ok';
  this.params = { alpha:0.012, kSigma:5, baseTh:12, minBlob:3, roi:null };
}
MosqActivity.prototype.reset = function(){
  this.initialized = false; this.aiS = null; this.secOut = null;
  this.acc = {t:-1, e:0, c:0, n:0, roiN:this.n}; this.status='ok';
};
MosqActivity.prototype.processFrame = function(gray, tSec){
  var w=this.w, h=this.h, P=this.params;
  var rx=0, ry=0, rw=w, rh=h;
  if (P.roi){
    rx=Math.max(0, P.roi.x|0); ry=Math.max(0, P.roi.y|0);
    rw=Math.min(w-rx, P.roi.w|0); rh=Math.min(h-ry, P.roi.h|0);
    if (rw<8 || rh<8){ P.roi=null; rx=0; ry=0; rw=w; rh=h; }
  }
  var roiN=rw*rh, bg=this.bg, mask=this.mask, prev=this.prev, d=this.dbuf;
  var i, x, y, idx;

  if (!this.initialized){
    for (i=0;i<this.n;i++) bg[i]=gray[i];
    prev.set(gray);
    this.initialized=true;
  }

  /* --- 差分与统计 --- */
  var sumG=0, sumD=0, m=0;
  for (y=ry; y<ry+rh; y++){
    var row=y*w;
    for (x=rx; x<rx+rw; x++){
      idx=row+x;
      var df = gray[idx]-bg[idx]; if (df<0) df=-df;
      d[idx]=df; sumD+=df; sumG+=gray[idx]; m++;
    }
  }
  var meanG=sumG/m, meanD=sumD/m;

  /* --- σ 稳健估计（MAD 采样） --- */
  var samp=this.samp, sn=0;
  outer:
  for (y=ry; y<ry+rh; y+=3){
    for (x=rx; x<rx+rw; x+=3){
      samp[sn++]=d[y*w+x];
      if (sn>=samp.length) break outer;
    }
  }
  var sub=samp.subarray(0,sn); sub.sort();
  var med = (sn&1)? sub[sn>>1] : (sub[(sn>>1)-1]+sub[sn>>1])/2;
  for (i=0;i<sn;i++){ var dv=samp[i]-med; samp[i]=dv<0?-dv:dv; }
  sub=samp.subarray(0,sn); sub.sort();
  var mad=(sn&1)? sub[sn>>1] : (sub[(sn>>1)-1]+sub[sn>>1])/2;
  var sig=Math.min(40, Math.max(0.5, 1.4826*mad));

  /* --- 掩膜阈值 --- */
  var th=Math.max(P.baseTh, P.kSigma*this.sigma);          // 背景差分阈值（σ 估计/守卫用）
  var thF=Math.max(P.baseTh*1.4, P.kSigma*this.sigma*1.6); // 帧间差分阈值（活动判定）

  /* --- 背景差分运动比（σ 更新与守卫） --- */
  var bdCnt=0;
  for (y=ry; y<ry+rh; y++){
    var row3=y*w;
    for (x=rx; x<rx+rw; x++){ idx=row3+x; if (d[idx]>th) bdCnt++; }
  }
  var bdRatio=bdCnt/roiN;
  if (bdRatio<0.15) this.sigma=this.sigma*0.9 + sig*0.1;

  /* --- 质量守卫：无信号 --- */
  if (meanG<6){ this.status='no-signal'; this._accFrame(0,0,roiN,tSec); return {energy:0,count:0,th:th,status:this.status}; }
  this.status='ok';

  /* --- 活动掩膜：帧间差分 → 腐蚀(≥2/4 邻) → 膨胀×2 --- */
  var tmp=this.tmp, er=this.er;
  tmp.fill(0); er.fill(0);
  var fdCnt=0;
  for (y=ry; y<ry+rh; y++){
    var r4=y*w;
    for (x=rx; x<rx+rw; x++){
      idx=r4+x;
      var fd=gray[idx]-prev[idx]; if (fd<0) fd=-fd;
      if (fd>thF){ tmp[idx]=1; fdCnt++; }
    }
  }
  if (fdCnt/roiN>0.6){   /* 场景切换/镜头突变：重置 */
    for (i=0;i<this.n;i++) bg[i]=gray[i];
    prev.set(gray); this.status='reinit';
    this._accFrame(0,0,roiN,tSec);
    return {energy:0, count:0, th:th, status:this.status};
  }
  /* 腐蚀：自身 + ≥2 个 4 邻域（去除孤立/成对噪点，保留带状运动区） */
  for (y=ry; y<ry+rh; y++){
    var r5=y*w;
    for (x=rx; x<rx+rw; x++){
      idx=r5+x;
      if (!tmp[idx]) continue;
      var nb=0;
      if (x>rx && tmp[idx-1]) nb++;
      if (x<rx+rw-1 && tmp[idx+1]) nb++;
      if (y>ry && tmp[idx-w]) nb++;
      if (y<ry+rh-1 && tmp[idx+w]) nb++;
      if (nb>=2) er[idx]=1;
    }
  }
  /* 膨胀×2：跨越帧间差分的断裂（同一虫的前后缘），得到连通活动区 */
  mask.fill(0);
  for (y=ry; y<ry+rh; y++){
    var r6=y*w;
    for (x=rx; x<rx+rw; x++){
      idx=r6+x;
      if (er[idx] || (x>rx&&er[idx-1]) || (x<rx+rw-1&&er[idx+1]) || (y>ry&&er[idx-w]) || (y<ry+rh-1&&er[idx+w])) mask[idx]=1;
    }
  }
  tmp.fill(0);
  for (y=ry; y<ry+rh; y++){
    var r7=y*w;
    for (x=rx; x<rx+rw; x++){
      idx=r7+x;
      if (mask[idx] || (x>rx&&mask[idx-1]) || (x<rx+rw-1&&mask[idx+1]) || (y>ry&&mask[idx-w]) || (y<ry+rh-1&&mask[idx+w])) tmp[idx]=1;
    }
  }

  /* --- 连通域（BFS）--- */
  var stack=this.stack, areas=this.areas; areas.length=0;
  var keptE=0, k, sp=0;
  for (y=ry; y<ry+rh; y++){
    var r8=y*w;
    for (x=rx; x<rx+rw; x++){
      idx=r8+x;
      if (tmp[idx]!==1) continue;
      var start=sp;              /* 本斑块像素写入区起点 */
      tmp[idx]=2; stack[sp++]=idx;
      var head=start;
      while (head<sp){
        var q=stack[head++];
        var qx=q%w, qy=(q-qx)/w;
        if (qx>rx && tmp[q-1]===1){ tmp[q-1]=2; stack[sp++]=q-1; }
        if (qx<rx+rw-1 && tmp[q+1]===1){ tmp[q+1]=2; stack[sp++]=q+1; }
        if (qy>ry && tmp[q-w]===1){ tmp[q-w]=2; stack[sp++]=q-w; }
        if (qy<ry+rh-1 && tmp[q+w]===1){ tmp[q+w]=2; stack[sp++]=q+w; }
      }
      var area=sp-start;
      if (area>=P.minBlob){
        keptE+=area;
        areas.push(area);
      } else {
        for (k=start;k<sp;k++) tmp[stack[k]]=0;
      }
      sp=start;                  /* 复用栈空间 */
    }
  }
  this.mask.set(tmp);            /* 供叠加显示（2=活动像素） */

  /* --- 活动虫数估计：以每帧最小斑块（孤立个体）为锚自标定 --- */
  var count=0;
  if (areas.length){
    var calMin=Infinity;
    for (i=0;i<areas.length;i++) if (areas[i]>=P.minBlob*4 && areas[i]<calMin) calMin=areas[i];
    if (calMin<Infinity){
      if (this.typical < P.minBlob*1.5) this.typical=calMin;                        /* 自举 */
      else if (calMin >= this.typical*0.4 && calMin < this.typical*0.8)
        this.typical=this.typical*0.9 + calMin*0.1;                                 /* 温和下调（过小的视为贴边裁剪，不标定） */
      else if (calMin > this.typical) this.typical=this.typical*0.995+calMin*0.005; /* 缓慢上调 */
    }
    var tp=Math.max(this.typical, P.minBlob*2);
    for (i=0;i<areas.length;i++) count+=Math.round(areas[i]/tp);
  }

  prev.set(gray);
  this._accFrame(keptE, count, roiN, tSec);
  return {energy:keptE, count:count, th:th, status:this.status};
};
MosqActivity.prototype._accFrame = function(e, c, roiN, tSec){
  var a=this.acc, sec=Math.floor(tSec);
  if (a.t===-1){ a.t=sec; a.e=0; a.c=0; a.n=0; }
  if (sec!==a.t){
    var ai=(a.e/Math.max(1,a.n))/a.roiN*1000;
    this.aiS = (this.aiS==null)? ai : this.aiS*0.65 + ai*0.35;
    this.secOut={t:a.t, ai:ai, cnt:a.c/Math.max(1,a.n), aiS:this.aiS};
    a.t=sec; a.e=0; a.c=0; a.n=0;
  }
  a.e+=e; a.c+=c; a.n++; a.roiN=roiN;
};
MosqActivity.prototype.pullSecond = function(){ var s=this.secOut; this.secOut=null; return s; };

/* ---------- 本机摄像头控制器（多路 · 画面仅在本机处理） ---------- */

MosqAlgo.register('activity', '0.1', MosqActivity);
