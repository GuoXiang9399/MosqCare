// ================= 预设数据（v2.1：自单文件迁出） =================
// ================= 示例数据 =================
var DEMO_NOW = new Date('2026-11-05T08:00:00');
var TODAY = '2026-11-05';
var STAGES = ['卵期','L1期','L2期','L3期','L4期','蛹期','成虫期'];
var PAGE_TITLES = {dashboard:'工作台', strains:'品系档案', batches:'蚊笼管理', 'batch-detail':'蚊笼详情', iot:'硬件接入', analytics:'统计分析', alerts:'预警中心', settings:'设置', about:'关于'};

// 默认无数据；预设数据通过设置页「导入预设数据」载入
function presetData(){
var strains = {
  S1:{code:'佛山株', abbr:'FS', name:'白纹伊蚊', latin:'Aedes albopictus', source:'', maxGen:'F12', note:''},
  S2:{code:'', abbr:'', name:'致倦库蚊', latin:'Cx. pipiens quinquefasciatus', source:'', maxGen:'F5', note:''}
};
var seq = 11, alertSeq = 4;
var batches = [
  {id:'FS-06', strain:'S1', gen:'F12', parent:'FS-03', start:'2026-11-05', eggs:300, stage:'卵期', count:300, status:'rearing', lastFeed:null,
   records:[
    {d:'2026-11-05', t:'stage', from:'—', to:'卵期', n:300, dead:0, method:'全数', after:{stage:'卵期', count:300}, note:'亲代蚊笼 FS-03 产卵收集'},
    {d:'2026-11-05', t:'env', tm:'09:10', temp:26.7, hum:76, photo:'14:10'}
   ]},
  {id:'FS-05', strain:'S1', gen:'F13', parent:'FS-04', start:'2026-11-02', eggs:600, stage:'L1期', count:588, status:'rearing', lastFeed:'2026-11-04 06:00',
   records:[
    {d:'2026-11-02', t:'stage', from:'—', to:'卵期', n:600, dead:0, method:'全数', after:{stage:'卵期', count:600}, note:'亲代蚊笼产卵收集'},
    {d:'2026-11-02', t:'env', tm:'15:30', temp:26.7, hum:76, photo:'14:10'},
    {d:'2026-11-04', t:'stage', from:'卵期', to:'L1期', n:588, dead:0, method:'全数', after:{stage:'L1期', count:588}, note:'未孵化卵 12 粒'},
    {d:'2026-11-04', t:'feed', tm:'06:00', type:'幼虫饲料', spec:'磨碎鱼饲料 0.4g', way:'撒喂'}
   ]},
  {id:'C-08', strain:'S2', gen:'F5', parent:'C-06', start:'2026-10-30', eggs:800, stage:'L3期', count:745, coStages:['L4期'], status:'rearing', lastFeed:'2026-11-05 07:00',
   records:[
    {d:'2026-10-30', t:'stage', from:'—', to:'卵期', n:800, dead:0, method:'全数', after:{stage:'卵期', count:800}, note:'卵源：亲代蚊笼 C-06 产卵收集'},
    {d:'2026-10-30', t:'env', tm:'10:00', temp:26.9, hum:80, photo:'14:10'},
    {d:'2026-10-31', t:'stage', from:'卵期', to:'L1期', n:772, dead:28, method:'全数', after:{stage:'L1期', count:772}},
    {d:'2026-10-31', t:'env', tm:'22:40', temp:29.8, hum:82, photo:'14:10', note:'加热棒故障时段'},
    {d:'2026-11-01', t:'feed', tm:'08:00', type:'幼虫饲料', spec:'磨碎鱼饲料 0.6g', way:'撒喂'},
    {d:'2026-11-02', t:'stage', from:'L1期', to:'L2期', n:758, dead:14, method:'全数', after:{stage:'L2期', count:758}},
    {d:'2026-11-03', t:'env', tm:'08:20', temp:27.4, hum:79, photo:'14:10'},
    {d:'2026-11-04', t:'stage', from:'L2期', to:'L3期', n:745, dead:13, method:'全数', after:{stage:'L3期', count:745}},
    {d:'2026-11-05', t:'feed', tm:'07:00', type:'幼虫饲料', spec:'磨碎鱼饲料 0.7g', way:'撒喂'}
   ]},
  {id:'FS-04', strain:'S1', gen:'F12', parent:'FS-03', start:'2026-10-22', eggs:500, stage:'蛹期', count:430, coStages:['成虫期'], status:'rearing', lastFeed:'2026-11-04 07:30',
   records:[
    {d:'2026-10-22', t:'stage', from:'—', to:'卵期', n:500, dead:0, method:'全数', after:{stage:'卵期', count:500}, note:'亲代蚊笼 FS-03（F11）产卵收集'},
    {d:'2026-10-22', t:'env', tm:'09:00', temp:26.5, hum:74, photo:'14:10'},
    {d:'2026-10-23', t:'feed', tm:'08:00', type:'幼虫饲料', spec:'磨碎鱼饲料 0.3g', way:'撒喂'},
    {d:'2026-10-24', t:'stage', from:'卵期', to:'L1期', n:480, dead:0, method:'全数', after:{stage:'L1期', count:480}},
    {d:'2026-10-27', t:'stage', from:'L1期', to:'L2期', n:462, dead:18, method:'全数', after:{stage:'L2期', count:462}},
    {d:'2026-10-28', t:'env', tm:'08:05', temp:26.5, hum:74, photo:'14:10'},
    {d:'2026-10-30', t:'stage', from:'L2期', to:'L3期', n:451, dead:11, method:'全数', after:{stage:'L3期', count:451}},
    {d:'2026-10-31', t:'feed', tm:'08:00', type:'幼虫饲料', spec:'磨碎鱼饲料 0.5g', way:'撒喂'},
    {d:'2026-11-01', t:'env', tm:'08:10', temp:27.2, hum:75, photo:'14:10'},
    {d:'2026-11-02', t:'stage', from:'L3期', to:'L4期', n:443, dead:8, method:'全数', after:{stage:'L4期', count:443}},
    {d:'2026-11-04', t:'feed', tm:'07:30', type:'幼虫饲料', spec:'磨碎鱼饲料 0.5g', way:'撒喂'},
    {d:'2026-11-05', t:'stage', from:'L4期', to:'蛹期', n:430, dead:13, method:'全数', after:{stage:'蛹期', count:430}, note:'淘汰弱蛹 21 只中含 L4 期死亡 13 只'},
    {d:'2026-11-05', t:'env', tm:'07:40', temp:26.8, hum:78, photo:'14:10'}
   ]},
  {id:'C-06', strain:'S2', gen:'F4', parent:'C-01', start:'2026-09-28', eggs:450, stage:'成虫期', count:380, coStages:['蛹期'], status:'rearing', lastFeed:'2026-11-03 09:00',
   records:[
    {d:'2026-09-28', t:'stage', from:'—', to:'卵期', n:450, dead:0, method:'全数', after:{stage:'卵期', count:450}},
    {d:'2026-09-28', t:'env', tm:'09:30', temp:26.9, hum:81, photo:'14:10'},
    {d:'2026-09-30', t:'stage', from:'卵期', to:'L1期', n:428, dead:22, method:'全数', after:{stage:'L1期', count:428}},
    {d:'2026-10-03', t:'stage', from:'L1期', to:'L2期', n:415, dead:13, method:'全数', after:{stage:'L2期', count:415}},
    {d:'2026-10-06', t:'stage', from:'L2期', to:'L3期', n:408, dead:7, method:'全数', after:{stage:'L3期', count:408}},
    {d:'2026-10-09', t:'stage', from:'L3期', to:'L4期', n:402, dead:6, method:'全数', after:{stage:'L4期', count:402}},
    {d:'2026-10-14', t:'stage', from:'L4期', to:'蛹期', n:395, dead:7, method:'全数', after:{stage:'蛹期', count:395}},
    {d:'2026-10-18', t:'stage', from:'蛹期', to:'成虫期', n:380, dead:15, method:'全数', after:{stage:'成虫期', count:380}, note:'羽化，转入成虫笼'},
    {d:'2026-10-18', t:'feed', tm:'09:00', type:'糖水', spec:'10% 蔗糖', way:'棉球更换'},
    {d:'2026-10-26', t:'feed', tm:'09:30', type:'血饲', spec:'小鼠麻醉血饲', way:'人工膜'},
    {d:'2026-10-29', t:'treat', type:'添加产卵杯', out:0, to:'预收 F5 卵', by:'当班饲养员'},
    {d:'2026-11-03', t:'feed', tm:'09:00', type:'糖水', spec:'10% 蔗糖', way:'棉球更换'}
   ]},
  {id:'FS-03', strain:'S1', gen:'F11', parent:'FS-02', start:'2026-09-15', eggs:500, stage:'成虫期', count:389, status:'closed', avgT:26.6, dur:{egg:2, larva:9, pupa:2},
   result:{closeDate:'2026-10-20', stage:'成虫期', finalCount:389, reason:'实验取用', note:'L2 阶段水质问题致存活率偏低（触发预警 A3）'},
   records:[
    {d:'2026-09-15', t:'stage', from:'—', to:'卵期', n:500, dead:0, method:'全数', after:{stage:'卵期', count:500}},
    {d:'2026-09-17', t:'stage', from:'卵期', to:'L1期', n:476, dead:24, method:'全数', after:{stage:'L1期', count:476}, note:'（L2–L3 期记录从略）'},
    {d:'2026-09-26', t:'stage', from:'L4期', to:'蛹期', n:428, dead:0, method:'全数', after:{stage:'蛹期', count:428}},
    {d:'2026-09-28', t:'stage', from:'蛹期', to:'成虫期', n:412, dead:16, method:'全数', after:{stage:'成虫期', count:412}},
    {d:'2026-10-20', t:'close', reason:'实验取用', n:389}
   ]},
  {id:'FS-02', strain:'S1', gen:'F10', parent:'FS-01', start:'2026-09-02', eggs:500, stage:'成虫期', count:401, status:'closed', avgT:27.2, dur:{egg:2, larva:8, pupa:2},
   result:{closeDate:'2026-10-05', stage:'成虫期', finalCount:401, reason:'产卵收获', note:''},
   records:[
    {d:'2026-09-02', t:'stage', from:'—', to:'卵期', n:500, dead:0, method:'全数', after:{stage:'卵期', count:500}},
    {d:'2026-09-04', t:'stage', from:'卵期', to:'L1期', n:482, dead:18, method:'全数', after:{stage:'L1期', count:482}, note:'（L2–L3 期记录从略）'},
    {d:'2026-09-12', t:'stage', from:'L4期', to:'蛹期', n:437, dead:0, method:'全数', after:{stage:'蛹期', count:437}},
    {d:'2026-09-14', t:'stage', from:'蛹期', to:'成虫期', n:421, dead:16, method:'全数', after:{stage:'成虫期', count:421}},
    {d:'2026-10-05', t:'close', reason:'产卵收获', n:401}
   ]},
  {id:'C-03', strain:'S2', gen:'F4', parent:'C-01', start:'2026-09-06', eggs:800, stage:'成虫期', count:676, status:'closed', avgT:26.1, dur:{egg:2, larva:8, pupa:2},
   result:{closeDate:'2026-10-08', stage:'成虫期', finalCount:676, reason:'产卵收获', note:''},
   records:[
    {d:'2026-09-06', t:'stage', from:'—', to:'卵期', n:800, dead:0, method:'全数', after:{stage:'卵期', count:800}},
    {d:'2026-09-08', t:'stage', from:'卵期', to:'L1期', n:764, dead:36, method:'全数', after:{stage:'L1期', count:764}, note:'（L2–L3 期记录从略）'},
    {d:'2026-09-16', t:'stage', from:'L4期', to:'蛹期', n:702, dead:0, method:'全数', after:{stage:'蛹期', count:702}},
    {d:'2026-09-18', t:'stage', from:'蛹期', to:'成虫期', n:683, dead:19, method:'全数', after:{stage:'成虫期', count:683}},
    {d:'2026-10-08', t:'close', reason:'产卵收获', n:676}
   ]},
  {id:'FS-01', strain:'S1', gen:'F9', start:'2026-08-20', eggs:500, stage:'成虫期', count:373, status:'closed', avgT:29.4, dur:{egg:2, larva:7, pupa:2},
   result:{closeDate:'2026-09-22', stage:'成虫期', finalCount:373, reason:'实验取用', note:'饲养间高温时段，发育偏快但存活偏低'},
   records:[
    {d:'2026-08-20', t:'stage', from:'—', to:'卵期', n:500, dead:0, method:'全数', after:{stage:'卵期', count:500}},
    {d:'2026-08-22', t:'stage', from:'卵期', to:'L1期', n:461, dead:39, method:'全数', after:{stage:'L1期', count:461}, note:'（L2–L3 期记录从略）'},
    {d:'2026-08-29', t:'stage', from:'L4期', to:'蛹期', n:402, dead:0, method:'全数', after:{stage:'蛹期', count:402}},
    {d:'2026-08-31', t:'stage', from:'蛹期', to:'成虫期', n:386, dead:16, method:'全数', after:{stage:'成虫期', count:386}},
    {d:'2026-09-22', t:'close', reason:'实验取用', n:373}
   ]},
  {id:'C-01', strain:'S2', gen:'F3', start:'2026-08-24', eggs:800, stage:'成虫期', count:712, status:'closed', avgT:25.8, dur:{egg:2, larva:7, pupa:2},
   result:{closeDate:'2026-09-25', stage:'成虫期', finalCount:712, reason:'产卵收获', note:''},
   records:[
    {d:'2026-08-24', t:'stage', from:'—', to:'卵期', n:800, dead:0, method:'全数', after:{stage:'卵期', count:800}},
    {d:'2026-08-26', t:'stage', from:'卵期', to:'L1期', n:771, dead:29, method:'全数', after:{stage:'L1期', count:771}, note:'（L2–L3 期记录从略）'},
    {d:'2026-09-02', t:'stage', from:'L4期', to:'蛹期', n:736, dead:0, method:'全数', after:{stage:'蛹期', count:736}},
    {d:'2026-09-04', t:'stage', from:'蛹期', to:'成虫期', n:718, dead:18, method:'全数', after:{stage:'成虫期', count:718}},
    {d:'2026-09-25', t:'close', reason:'产卵收获', n:712}
   ]}
];
var alerts = [
  {id:'A1', level:'warn', type:'环境超标', batch:'C-08', msg:'温度 29.8℃ 超出阈值 24–28℃', detail:'触发 29.8℃ / 阈值 ≤28℃（2026-10-31 22:40 环境记录）', at:'2026-10-31 22:40', state:'open'},
  {id:'A2', level:'info', type:'饲喂超时', batch:'FS-05', msg:'距上次饲喂 26h，超过间隔上限 24h', detail:'触发 26h / 阈值 ≤24h（卵–L4 期蚊笼）', at:'2026-11-05 08:00', state:'open'},
  {id:'A3', level:'warn', type:'存活率偏低', batch:'FS-03', msg:'累积存活率 77.8%，低于阈值 80%', detail:'触发 77.8% / 阈值 ≥80%', at:'2026-10-18 09:20', state:'done', action:'更换饲养水并降低幼虫密度', by:'当班饲养员', atDone:'2026-10-18 15:00'}
];
return {strains:strains, batches:batches, alerts:alerts, seq:seq, alertSeq:alertSeq, currentBatch:'FS-04'};
}
