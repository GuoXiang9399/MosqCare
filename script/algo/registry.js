// ================= 算法注册表（v2.1） =================
// 算法模块通过 MosqAlgo.register(名称, 版本, 构造函数) 注册；
// 会话按所用版本记录，便于算法迭代后的结果对比与复现。
var MosqAlgo = {
  _reg: {},
  register: function(name, ver, Ctor){ this._reg[name + '@' + ver] = Ctor; this._reg[name + '@latest'] = Ctor; },
  get: function(name, ver){ return this._reg[name + '@' + (ver || 'latest')] || null; },
  list: function(name){
    var out = [];
    for (var k in this._reg){ if (k.indexOf(name + '@') === 0 && k.indexOf('@latest') < 0) out.push(k.split('@')[1]); }
    return out.sort();
  }
};
