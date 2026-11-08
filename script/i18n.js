// ================= i18n（v1.8，v2.2 迁出为独立模块） =================
var MC_LANG_LOCK = window.MC_LANG_LOCK || null;
var LANG = MC_LANG_LOCK || (function(){ try { return localStorage.getItem('mcLang') || 'zh'; } catch(e){ return 'zh'; } })();
var I18N = {
  // —— 导航 / 通用 ——
  '工作台':'Dashboard','品系档案':'Strain Records','蚊笼管理':'Cage Management','蚊笼详情':'Cage Details','IoT 接入':'IoT Integration','统计分析':'Statistics','预警中心':'Alert Center','设置':'Settings','关于':'About',
  '在养蚊笼':'Open cages','在养虫数（只）':'Mosquitoes in rearing','待处理预警':'Open alerts','并存阶段：':'Co-occurring stages: ','点击进入预警中心':'Open Alert Center',
  'MosqCare · 蚊媒饲养工作台':'MosqCare · Mosquito Rearing Workbench',
  'v1.8 · 2026-11-07 发布':'v1.8 · Released 2026-11-07',
  'v2.1 · 2026-11-08 发布':'v2.1 · Released 2026-11-08',
  'v2.2 · 2026-11-08 发布':'v2.2 · Released 2026-11-08',
  '本地数据文件夹':'Local Data Folders','打开数据文件夹':'Open Data Folder','打开结果文件夹':'Open Results Folder','数据目录：':'Data folder: ',
  '（data/ 存品系、蚊笼与预警；result/ 存监测会话、视频与导出文件，全部实时落盘）':' (data/ holds strains, cages and alerts; result/ holds monitoring sessions, videos and exports — all saved to disk in real time)',
  '当前为浏览器预览模式，数据仅保存在内存中。桌面安装版会将全部记录实时写入安装目录的 data/（品系、蚊笼、预警）与 result/（监测会话、视频、导出文件）。':'Browser preview mode: data is kept in memory only. The desktop app writes all records in real time to data/ (strains, cages, alerts) and result/ (sessions, videos, exports) under its install folder.',
  ' — 数据本地落盘：安装目录自动生成 data/（品系、蚊笼、预警）与 result/（监测会话、视频、导出文件），所有记录实时写入本地，关闭软件不丢失；监测视频默认留存 result/videos/ 并可导出；CSV 导出同步留存 result/exports/；启动自动恢复上次数据，用户放入 data/ 的品系档案 / 蚊笼列表 CSV 也会被读取合并；新增系统托盘：关闭窗口后台驻留，右下角托盘图标常驻入口（左键显示主界面，菜单可退出）；安装改为当前用户级（无需管理员权限）。':' — Local data persistence: data/ (strains, cages, alerts) and result/ (sessions, videos, exports) are created under the install folder; all records are written to disk in real time and survive app restarts; monitoring videos are kept in result/videos/ by default; CSV exports are also saved to result/exports/; previous data is restored at startup and user-placed profile/cage CSVs in data/ are merged on boot; new system tray: closing the window keeps the app running with a tray icon in the system corner (left-click shows the main window, menu offers exit); installation switched to per-user (no admin required).',
  '— 修复本地接入预览黑屏（显示画布未逐帧绘制）；监测记录新增同步录制摄像头视频（WebM，停止记录后自动下载留存）；CSV 导出全面实装（蚊笼列表/全部管理记录、品系档案含关联蚊笼与代际分布、品系代际关系、统计分析、预警中心）；工程结构拆分为 index.html + script/（i18n、算法、应用）+ data/（预设数据）+ result/（结果留存），算法版本化注册便于迭代与复现。':' — Fixed black preview in Local Devices (display canvas never drew frames); monitoring sessions now record camera video (WebM, auto-saved on stop); CSV export fully implemented (cage list and all rearing records, strain profiles with linked cages and generation summary, strain lineage, analytics, alerts); restructured into index.html + script/ (i18n, algorithms, app) + data/ (preset data) + result/ (results), with version-registered algorithms for iteration and reproducibility.',
  '2026-11-05 周四':'Thu, Nov 5, 2026',
  '＋ 新增品系':'+ New Strain','导入 CSV':'Import CSV','导出 CSV':'Export CSV','导出全部记录':'Export All Records','导出代际关系':'Export Lineage','＋ 新建蚊笼':'+ New Cage','＋ 新增记录':'+ New Record',
  '详情':'Details','记录':'Record','报告':'Report','同步设备':'Sync Devices','接入指南':'Setup Guide','保存阈值':'Save Thresholds',
  '保存':'Save','取消':'Cancel','保存记录':'Save Record','保存品系':'Save Strain','创建蚊笼':'Create Cage','确认结束':'Confirm Close','返回检查':'Back to Review',
  '打印 / 导出 PDF':'Print / Export PDF','编辑信息':'Edit Info','编辑':'Edit','删除':'Delete','确认删除':'Confirm Delete',
  '立即采集':'Capture Now','查看画面':'View Live','开启':'On','关闭':'Off','确认导入':'Confirm Import',
  '导入预设数据':'Load Demo Data','删除预设数据':'Delete Demo Data','确认清空全部数据':'Confirm: erase all data',
  '全部':'All','饲养中':'Rearing','已结束':'Closed','已废弃':'Discarded','全部品系':'All strains','在养':'Rearing','· 在养':'· rearing',
  '白纹伊蚊':'Aedes albopictus','致倦库蚊':'Cx. pipiens quinquefasciatus','佛山株':'Foshan strain',
  '卵期':'Egg','L1期':'L1','L2期':'L2','L3期':'L3','L4期':'L4','蛹期':'Pupa','成虫期':'Adult','幼虫期':'Larva',
  '笼号':'Cage ID','品系 / 世代':'Strain / Gen','起始日期':'Start date','当前阶段':'Current stage','当前数量':'Current count','累积存活率':'Cumulative survival','状态':'Status','操作':'Actions','世代':'Generation','世代号':'Generation no.','存活率':'Survival','品系':'Strain',
  // —— 工作台 / 品系 ——
  '点击品系卡片可查看该蚊株的代系关系与关联蚊笼。':'Click a strain card to view its lineage tree and linked cages.',
  '前缀 ':'prefix ','来源：':'Source: ','缩写 ':'Abbr. ',
  '点击查看代系关系与关联蚊笼':'View lineage and linked cages','点击查看蚊笼详情':'View cage details',
  '代系关系（树状，点击节点查看蚊笼详情）':'Lineage tree (click a node for cage details)',
  '暂无蚊笼记录':'No cage records yet','暂无品系：可从 CSV 导入或在「品系档案」新建。':'No strains yet: import from CSV or create one in Strain Records.',
  '暂无在养蚊笼，请前往「蚊笼管理」新建':'No open cages — create one in Cage Management',
  '名称':'Name','蚊株':'Strain code','蚊株缩写':'Code abbr.','拉丁名':'Latin name','来源':'Source','备注':'Notes','物种（拉丁名）':'Species (Latin name)',
  // —— 蚊笼详情 ——
  '生命周期进度':'Life-cycle Progress','记录时间线':'Record Timeline','未记录':'Not logged',
  '计':'Ct.','环':'Env','饲':'Feed','处':'Exp','结':'End','卵入笼':'Eggs in cage',
  '淘汰 ':'cull ','终末数量 ':'Final count ','移出 ':'Removed ','去向：':'Destination: ','操作人：':'Operator: ',
  // —— IoT ——
  '米家账号':'Mi Home account','● 已登录 · 直连':'● Signed in · Direct',
  '温湿度传感器':'Temp & Humidity Sensors','自动采集 → 环境记录':'Auto-logging → Env. records',
  '摄像头':'Cameras','实时画面 · 快照存证':'Live view · Snapshot evidence',
  '插座开关控制':'Smart Plug Control','远程控制 · 预警联动':'Remote control · Alert linkage',
  'RTSP 就绪':'RTSP ready','无 RTSP · 不支持取流':'No RTSP · no streaming',
  '画面经内置连接器播放 · 快照存证':'Live via built-in connector · snapshot evidence',
  '未绑定':'Unbound','已开启':'On','已关闭':'Off','当前 ':'Now ',
  '暂无温湿度传感器：登录米家账号后点「同步设备」自动发现，或按「接入指南」接入。':'No sensors yet: sign in to your Mi Home account and click "Sync Devices", or follow the setup guide.',
  '暂无摄像头：登录米家账号后点「同步设备」，建议选用固件带 RTSP 开关的型号。':'No cameras yet: sign in and click "Sync Devices"; choose models with the firmware RTSP switch.',
  '暂无插座设备：登录米家账号后点「同步设备」，可远程控制加热垫、风扇与光周期定时。':'No plugs yet: sign in and click "Sync Devices" to remotely control heating pads, fans and photoperiod timers.',
  '米家连接器通道 · 局域网低延迟':'Mi Home connector channel · LAN low latency',
  '米家连接器 · 局域网低延迟通道 · 示意画面':'Mi Home connector · LAN low-latency channel · placeholder view',
  '该型号无 RTSP 开关，暂不支持取流，建议更换 RTSP 型号':'This model has no RTSP switch and cannot stream yet; choose an RTSP-capable model',
  '当前为示意画面；正式接入后由内置米家连接器取流播放（建议选用固件支持 RTSP 访问的型号，走局域网低延迟通道），快照经本地服务存证并关联蚊笼记录。无 RTSP 开关的型号暂不支持取流。':'Placeholder view; after integration the built-in Mi Home connector streams live video (choose models whose firmware has the RTSP switch for LAN low-latency). Snapshots are archived locally and linked to cage records. Models without the RTSP switch do not support streaming yet.',
  // —— 统计 ——
  '时间范围（按蚊笼起始日期）':'Time range (by cage start date)','近 90 天':'Last 90 days','近 30 天':'Last 30 days',
  '平均发育历期（天）':'Mean development duration (days)','阶段转化率（已结束蚊笼平均值）':'Stage conversion rates (mean of closed cages)',
  '各蚊笼累积存活率（已结束蚊笼）':'Cumulative survival by cage (closed cages)','月度产出趋势（按蚊笼结束月份）':'Monthly output trend (by closing month)',
  '各蚊株累积产出（终末成虫合计）':'Cumulative output by strain (total final adults)','世代对比（累积存活率 · 按品系 / 世代聚合）':'Generation comparison (cumulative survival by strain / generation)',
  '孵化率':'Hatch rate','化蛹率':'Pupation rate','羽化率':'Eclosion rate','含在养':'incl. open',
  '历期按已结束蚊笼的阶段记录汇总；横轴满刻度 10 天。':'Durations aggregated from stage records of closed cages; x-axis full scale 10 days.',
  '孵化率 = L1 数量 ÷ 起始卵量；化蛹率 = 蛹 ÷ L4；羽化率 = 成虫 ÷ 蛹。':'Hatch rate = L1 ÷ initial eggs; pupation = pupae ÷ L4; eclosion = adults ÷ pupae.',
  '按结束日期月份聚合已结束蚊笼的终末成虫数量；「实验取用」与「产卵收获」均计入产出。':'Final adult counts of closed cages aggregated by closing month; both experimental use and egg collection count as output.',
  '按蚊株聚合已结束蚊笼的终末成虫数量。':'Final adult counts aggregated by strain.',
  '含在养蚊笼即时存活率仅供监测参考，正式对比以已结束蚊笼为准。':'Instant survival of open cages is for monitoring only; formal comparison uses closed cages.',
  '产能报表':'Production Report','环境与存活关联':'Environment–Survival Link',
  '已结束蚊笼明细：起始卵量 / 终末数量 / 累积存活率 / 平均温度 / 结束原因':'Closed-cage details: initial eggs / final count / cumulative survival / mean temp. / close reason',
  '蚊笼平均温度 × 累积存活率 散点图（仅呈现相关性）':'Mean rearing temperature × cumulative survival scatter (correlation only)',
  '起始卵量':'Initial eggs','终末数量':'Final count','平均温度':'Mean temp.','结束日期':'Close date','结束原因':'Close reason',
  '暂无数据：新建蚊笼或从 CSV 导入后，此处将自动生成统计。':'No data yet: statistics appear here after creating cages or importing CSV.',
  '筛选后已结束蚊笼不足 3 个，图表暂不呈现以避免误读（产能报表与关联分析可从下方入口查看）。':'Fewer than 3 closed cages after filtering — charts hidden to avoid misreading (see the report and link analysis below).',
  '暂无已结束蚊笼：结束后自动进入产能报表。':'No closed cages yet: closed cages enter the production report automatically.',
  '蚊笼平均饲养温度（℃）':'Mean rearing temperature (℃)','累积存活率（%）':'Cumulative survival (%)',
  '每个点为一个已结束蚊笼。图示仅呈现相关性，不构成因果结论。':'Each point is one closed cage. Correlation shown, not causation.',
  '样本不足，暂不呈现，避免误读（需至少 3 个含环境记录的已结束蚊笼）。':'Insufficient sample — hidden to avoid misreading (needs ≥ 3 closed cages with env. records).',
  // —— 预警 ——
  '质量预警':'Quality Alerts','预警阈值':'Alert Thresholds','默认值为常用饲养参数，请按本室规程调整':'Defaults are common rearing parameters; adjust to your colony SOP',
  '温度下限（℃）':'Temp. lower limit (℃)','温度上限（℃）':'Temp. upper limit (℃)','湿度下限（%）':'RH lower limit (%)','湿度上限（%）':'RH upper limit (%)',
  '累积存活率下限（%）':'Survival lower limit (%)','饲喂间隔上限（h，卵–L4 期）':'Max feeding interval (h, egg–L4)','记录断档上限（h）':'Max record gap (h)',
  '修改仅影响此后检测，不回溯历史预警':'Applies to future checks only; past alerts unchanged',
  '环境超标':'Env. out of range','存活率偏低':'Low survival','饲喂超时':'Feeding overdue','记录断档':'Record gap',
  '待处理':'Open','已提醒':'Reminded','已关闭（蚊笼结束）':'Closed (cage closed)','警告':'Warning','提示':'Notice','处理建议：':'Suggested action: ',
  '预警统计（累计触发）':'Alert summary (cumulative)',
  '调整空调 / 加湿除湿设备；如已接入 IoT 恒温加热垫或循环风扇，可远程开启辅助调节（见「IoT 接入」）。':'Adjust HVAC / humidifier; if an IoT heating pad or fan is linked, switch it on remotely (see IoT Integration).',
  '检查饲料与水质，排查饲养密度与温度；异常个体单独隔离观察。':'Check diet and water quality, review density and temperature; isolate abnormal individuals.',
  '尽快补喂，并核对饲喂计划与记录习惯。':'Feed as soon as possible and review the feeding schedule and logging habit.',
  '补记当日观察结果，避免台账断档影响统计口径。':'Back-fill the observation to keep the ledger continuous.',
  '按本室饲养规程处理，必要时结合 IoT 设备辅助调节。':'Follow your colony SOP; use IoT devices to assist if needed.',
  '暂无预警记录':'No alert records',
  // —— 设置 / 关于 ——
  '数据与备份':'Data & Backup','每日关闭前提醒备份数据文件':'Remind me to back up the data file before closing each day',
  '切换界面显示语言，立即生效。':'Switch the UI language. Takes effect immediately.',
  '软件默认无数据。「导入预设数据」载入内置示例数据（品系、蚊笼、记录与预警），用于快速了解软件功能；「删除预设数据」清空全部品系、蚊笼、记录与预警（两击确认），删除前建议先导出 CSV 备份。':'The app starts with no data. "Load Demo Data" imports built-in sample data (strains, cages, records and alerts) for a quick tour; "Delete Demo Data" erases all strains, cages, records and alerts (double-click to confirm). Export a CSV backup first.',
  'MosqCare 蚊媒饲养工作台':'MosqCare Mosquito Rearing Workbench',
  '面向个人 / 小实验室的蚊虫饲养过程管理工具：记录、统计、分析、可视化。单机使用，无账号体系。':'A rearing management tool for individual researchers and small laboratories: record, track, analyze and visualize the mosquito rearing process. Standalone, no accounts.',
  '开发者：河南大学基础医学院 / 深圳研究院 郭祥':'Developer: Xiang Guo, School of Basic Medical Sciences / Shenzhen Research Institute, Henan University',
  '更新日志':'Changelog',
  // —— 更新日志（关于页） ——
  '— 界面支持中英双语，可在设置页切换显示语言；正式发布 Windows 桌面安装包，分完整版（中英双语）与中文版（锁定中文）两个版本。':' — Bilingual UI (Chinese / English) switchable in Settings; official Windows desktop installers released in two editions: full (bilingual) and Chinese edition (Chinese-locked).',
  '— IoT 改为内置米家连接器（内嵌小米官方集成内核）：小米账号在软件内登录、一键同步设备，无需自建 Home Assistant（HA 降为可选高级路径）；界面改为全屏软件预览；发布版：默认无数据、设置支持导入 / 删除预设数据，新增记录重构为「饲喂 / 环境 / 阶段计数 / 实验处理」分组，去除冲正机制，虫态图标改为二次元萌系风格，生命周期卡片可读性优化。':' — IoT switched to the built-in Mijia connector (embedding Xiaomi official integration kernel): sign in with your Xiaomi account in-app and sync devices in one click, no Home Assistant needed (now an optional advanced path); UI switched to full-screen software preview; release build starts empty with demo-data import / deletion in Settings; record entry restructured into Feeding / Environment / Stage Count / Experiment groups; correction mechanism removed; anime-style stage icons; improved life-cycle card readability.',
  '— 界面去演示化标注；预警简化为「只预警 + 处理建议」（取消处置表单）；IoT 三类设备各附接入指南；蚊笼详情新增编辑 / 删除蚊笼；规划 Windows 桌面安装包。':' — Removed demo-mode labels; alerts simplified to "alert + suggested action" (disposition form removed); setup guides added for all three IoT device types; cage edit / delete added to cage details; Windows installer planned.',
  '— 新增「IoT 接入」面板（F12）：温湿度传感器自动采集写环境记录、摄像头实时画面与快照、插座开关远程控制；接入经 Home Assistant 中转（设备链路待接入）。':' — New "IoT Integration" panel (F12): sensor auto-logging into environment records, camera live view and snapshots, smart-plug remote control; access via Home Assistant relay (device links pending).',
  '— 卡片图标卡通化并调大；多阶段并行显示（并存阶段徽章）；卡片等高、按钮贴底；预警阈值移至预警中心；品系档案与蚊笼管理支持 CSV 导入 / 导出；统计新增阶段转化率与月度产出趋势。':' — Cartoon-style enlarged card icons; multi-stage coexistence badges; equal-height cards with bottom-aligned buttons; alert thresholds moved to Alert Center; CSV import / export for strain records and cage list; stage conversion rates and monthly output trend added to Statistics.',
  '— 品系物种 / 蚊株信息可编辑；代系关系改树状展示（支持一笼扩繁多个子代）；生命周期进度一屏显示；统计卡片分组；报告表头简化。':' — Editable strain species / code info; lineage shown as a tree (supports multiple sub-cages per parent); life-cycle progress on one screen; grouped statistic cards; simplified report header.',
  '— 单页饲养报告（AeLabStr 模板改编）；设置页；关于；各面板导出 CSV；品系代系关系与关联蚊笼；统计增加世代对比与预警统计。':' — One-page rearing report (adapted AeLabStr template); Settings page; About page; CSV export in every panel; strain lineage tree and linked cages; generation comparison and alert statistics added.',
  '— 蓝色主题；以蚊笼为单位；图形化虫态卡片；预警直接标注在蚊笼卡片上；品系档案独立栏目。':' — Blue theme; cage as the core unit; graphical stage cards; alerts shown directly on cage cards; dedicated Strain Records section.',
  '— 首版：四类记录、预警闭环、统计分析、交互式 PRD。':' — First release: four record types, alert loop, statistics, interactive PRD.',
  // —— 模态 / 表单 ——
  '新增记录':'New Record','饲喂':'Feeding','环境':'Environment','阶段计数':'Stage Count','实验处理':'Experiment',
  '日期':'Date','转入阶段（下一阶段）':'Next stage','计数方式':'Counting method','全数':'Full count','抽样估算':'Sampling est.',
  '转入数量':'Transferred in','淘汰 / 死亡数':'Culled / dead','时间':'Time','类型':'Type',
  '糖水':'Sugar water','幼虫饲料':'Larval diet','血饲':'Blood meal','规格':'Specification','方式':'Method',
  '棉球更换':'Cotton ball','撒喂':'Sprinkled','人工膜':'Artificial membrane','其他':'Other',
  '温度（℃）':'Temperature (℃)','相对湿度（%）':'Relative humidity (%)','光周期（L : D）':'Photoperiod (L:D)',
  '保存后超出预警阈值将自动生成环境预警。':'Values beyond alert thresholds will raise an environment alert on save.',
  '取样送检':'Sample for testing','分装扩繁':'Sub-splitting','药物处理':'Chemical treatment','感染饲毒':'Infection feeding','添加产卵杯':'Add oviposition cup',
  '移出当期个体数':'Individuals removed','去向 / 用途':'Destination / purpose','操作人':'Operator','当班饲养员':'Duty technician',
  '移出数量将从当前数量中扣减；「分装扩繁」请另建子笼并在备注中关联。':'Removed individuals are deducted from the current count; for sub-splitting, create a sub-cage and link it in notes.',
  '新增品系':'New Strain','新建蚊笼':'New Cage','亲代蚊笼':'Parent cage','起始卵量（粒）':'Initial eggs (count)','来源说明':'Source note',
  '保存后可在品系档案点击卡片查看代系关系与关联蚊笼；新建蚊笼时的品系下拉将同步更新。':'After saving, click the strain card in Strain Records to view lineage and linked cages; the strain dropdown of the new-cage form updates accordingly.',
  '提交后自动生成一条「卵入笼」记录，笼号自动生成（C-流水号），并进入蚊笼详情。':'An "eggs in cage" record is created on submit; the cage ID is auto-generated (C-numbered) and the cage detail opens.',
  '结束蚊笼':'Close Cage','结束日期':'Close date','终末阶段':'Final stage','结束原因':'Close reason',
  '产卵收获':'Egg collection','实验取用':'Experimental use','自然淘汰':'Natural die-off','全量废弃':'Full discard',
  '我已复核终末数量与阶段（必选）':'I have verified the final count and stage (required)',
  '结束操作不可撤销，该蚊笼将转为只读并进入产能统计。':'Closing is irreversible; the cage becomes read-only and enters production statistics.',
  '单页饲养报告':'One-page Rearing Report','摄像头画面':'Camera Live',
  '编辑蚊笼':'Edit Cage','接入指南':'Setup Guide','导入数据':'Import Data','关闭':'Close','— 无 —':'— None —',
  'CSV 列顺序：':'CSV column order: ',
  '。首行为表头会自动忽略；字段内请勿使用英文逗号；蚊株 / 笼号已存在则更新该条，否则新增。':'. The header row is ignored; avoid commas inside fields; existing strain codes / cage IDs are updated, otherwise a new row is added.',
  '导入品系档案':'Import Strain Records','导入蚊笼列表':'Import Cage List',
  'AeLabStr 蚊虫品系饲养记录单':'AeLabStr Mosquito Colony Rearing Record',
  '由 MosqCare 生成':'Generated by MosqCare',
  '蚊株名称':'Strain name','卵编号':'Egg lot no.','记录日期':'Record date','当前数量 / 存活率':'Count / survival',
  '日期':'Date','时间':'Time','内容':'Content','数量':'Quantity','备注':'Notes',
  '负责人签名：＿＿＿＿＿＿':'Signature of person in charge: ________',
  '复核人签名：＿＿＿＿＿＿':'Signature of reviewer: ________',
  'MosqCare · 蚊媒饲养工作台':'MosqCare · Mosquito Rearing Workbench',
  '粒':'eggs','只':'mosq.','天':'d',' 笼':' cages',
  // —— 占位符 ——
  '如 430':'e.g. 430','选填，如：亲代来源、水质情况':'Optional, e.g. parental source, water quality',
  '例：10% 蔗糖 / 磨碎鱼饲料 0.5g / 小鼠麻醉血饲':'e.g. 10% sucrose / ground fish diet 0.5g / anesthetized mouse blood',
  '选填':'Optional','例：卵 800 粒 → 新建蚊笼 C-08':'e.g. 800 eggs → new cage C-08',
  '如 白纹伊蚊':'e.g. Aedes albopictus','如 佛山株':'e.g. Foshan strain',
  '如 FS，用作笼号前缀':'e.g. FS, used as cage ID prefix','如 FS，用作该株蚊笼笼号前缀':'e.g. FS, used as ID prefix for this strain',
  '如 本室驯化 / 野外采集':'e.g. lab colony / field collection','如 敏感品系，实验对照用':'e.g. susceptible strain, for controls',
  '例：亲代蚊笼产卵收集 / 野外采集':'e.g. eggs from parent cage / field collection','如 500':'e.g. 500',
  // —— 提示 / 校验消息 ——
  '已同步米家设备：温湿度计 3 · 摄像头 2 · 智能插座 3':'Synced Mi Home devices: 3 temp-hum sensors · 2 cameras · 3 smart plugs',
  '该蚊笼不在饲养中，记录入口已关闭':'Cage is not rearing; record entry disabled',
  '请先在「品系档案」新增或导入品系':'Create or import a strain first in Strain Records',
  '蚊株名称不能为空':'Strain name cannot be empty','品系信息已保存':'Strain info saved',
  '仅饲养中的蚊笼可以结束':'Only rearing cages can be closed',
  '日期不得晚于今天':'Date cannot be later than today','请填写规格':'Please enter the specification','请填写名称':'Please enter a name',
  '温度需在 10–40℃ 之间':'Temperature must be 10–40℃','湿度需在 20–100% 之间':'Humidity must be 20–100%',
  '移出数量不能为负':'Removed count cannot be negative','转入数量需 ≥ 1':'Transferred-in count must be ≥ 1','不能为负数':'Cannot be negative',
  '起始卵量需 ≥ 1':'Initial eggs must be ≥ 1','终末数量需 ≥ 0':'Final count must be ≥ 0',
  '请选择结束日期':'Please choose the closing date','请先勾选「我已复核终末数量与阶段」':'Please tick "I have verified the final count and stage" first',
  '保存失败：温度下限须小于上限':'Save failed: temp. lower limit must be below upper limit',
  '保存失败：湿度下限须小于上限':'Save failed: RH lower limit must be below upper limit',
  '保存失败：存活率阈值需在 0–100 之间':'Save failed: survival threshold must be 0–100',
  '保存失败：间隔阈值需大于 0':'Save failed: interval thresholds must be > 0',
  '阈值已保存，仅影响此后检测':'Thresholds saved; applies to future checks only',
  '笼号不能为空':'Cage ID cannot be empty','蚊笼信息已更新':'Cage info updated',
  '该传感器未绑定在养蚊笼':'This sensor is not bound to an open cage',
  '已导入预设数据':'Demo data loaded',
  '记录已保存':'Record saved','并触发存活率预警':'; survival alert raised','饲喂记录已保存':'Feeding record saved',
  '环境记录已保存':'Env. record saved','并触发环境预警':'; environment alert raised','实验处理记录已保存':'Experiment record saved',
  '；分装扩繁请另建子笼并备注关联':'; create a sub-cage and link it in notes',
  '蚊笼已结束，已进入产能统计':'Cage closed and added to production statistics',
  '当前筛选条件下暂无蚊笼，可调整筛选或新建蚊笼':'No cages match the filter — adjust it or create a new cage',
  '暂无蚊笼：请先在「品系档案」导入或新建品系，再于「蚊笼管理」新建蚊笼。':'No cages yet: import or create a strain in Strain Records, then create a cage in Cage Management.',
  // —— IoT 接入指南 ——
  '温湿度传感器 · 接入指南':'Temp & Humidity Sensors · Setup Guide',
  '<b>1. 登录米家账号：</b>在上方「米家账号」处输入手机号 / 邮箱，短信验证码登录。只需登录一次，此后自动保持连接。':'<b>1. Sign in to Mi Home:</b> enter your phone / email above and log in with the SMS code. Sign in once; the connection persists.',
  '<b>2. 设备就绪：</b>蓝牙温湿度计（如 LYWSD03MMC）装入电池即可；Wi-Fi 型在米家 App 完成配网。电脑需有蓝牙适配器（或配一个蓝牙网关）。':'<b>2. Prepare devices:</b> BLE sensors (e.g. LYWSD03MMC) just need batteries; Wi-Fi models are paired in the Mi Home app. The PC needs a Bluetooth adapter (or a BLE gateway).',
  '<b>3. 同步设备：</b>点「同步设备」，内置连接器自动发现账号下的传感器，出现在本页列表。':'<b>3. Sync devices:</b> click "Sync Devices"; the built-in connector discovers the sensors on your account and lists them here.',
  '<b>4. 绑定蚊笼：</b>在传感器卡片上「绑定蚊笼」；此后按 15–60 分钟间隔自动生成环境记录并联动 F8 预警，无需手动抄录。':'<b>4. Bind a cage:</b> bind the sensor to a cage on its card; env. records are then logged every 15–60 min and linked to F8 alerts — no manual transcription.',
  '<b>提示：</b>蓝牙型走局域网直连、断云可用；v4/v5 加密型首次接入需在米家 App 授权，连接器会自动完成密钥导入。':'<b>Note:</b> BLE models connect over the LAN and work offline; v4/v5 encrypted models need one-time authorization in the Mi Home app — the connector imports the keys automatically.',
  '摄像头 · 接入指南':'Cameras · Setup Guide',
  '<b>1. 登录并同步：</b>登录米家账号后点「同步设备」，账号下的摄像头自动出现在本页。':'<b>1. Sign in and sync:</b> after signing in, click "Sync Devices"; your cameras appear here automatically.',
  '<b>2. 确认在线：</b>在米家 App 确认摄像头在线可看。':'<b>2. Check online status:</b> confirm in the Mi Home app that the camera is online and viewable.',
  '<b>3. 绑定蚊笼：</b>在摄像头卡片「关联蚊笼」后，点「查看画面」即可在蚊笼上下文中观看实时画面，快照自动存证关联。':'<b>3. Bind a cage:</b> after linking the camera to a cage, click "View Live" to watch the stream in cage context; snapshots are archived and linked automatically.',
  '<b>4. 关于型号选择：</b>固件带「RTSP 访问」开关的型号开启后走局域网低延迟通道；<b>无 RTSP 开关的型号暂不支持取流</b>（小米未开放个人云取流通道），选购时优先带 RTSP 开关的型号。转流服务已随安装包内置，无需自行部署 go2rtc。':'<b>4. Model selection:</b> models whose firmware has the "RTSP access" switch stream over the LAN low-latency channel; <b>models without it cannot stream yet</b> (Xiaomi does not open personal cloud streaming). Prefer RTSP-capable models. The relay service is bundled with the installer — no need to deploy go2rtc yourself.',
  '插座开关 · 接入指南':'Smart Plugs · Setup Guide',
  '<b>1. 设备配网：</b>智能插座按米家 App 正常配网；登录账号后「同步设备」即可自动发现。':'<b>1. Pair the plug:</b> pair the smart plug in the Mi Home app as usual; after signing in, "Sync Devices" finds it automatically.',
  '<b>2. 接入用电设备：</b>将恒温加热垫、循环风扇、光周期定时器等蚊房设备接入插座，并在卡片上标注用途、关联蚊笼。':'<b>2. Connect loads:</b> plug rearing-room devices (heating pad, circulation fan, photoperiod timer) into the smart plug, and note their purpose and linked cage on the card.',
  '<b>3. 远程控制：</b>在卡片上直接开关；操作与状态变化实时同步。':'<b>3. Remote control:</b> switch on/off directly on the card; actions and state changes sync in real time.',
  '<b>4. 预警联动（可选）：</b>温度持续低于下限自动开启加热垫、湿度超上限自动开启风扇等规则，可在卡片「预警联动」中开启（建议开启前人工复核）。':'<b>4. Alert linkage (optional):</b> rules such as turning the heating pad on when temperature stays below the lower limit, or the fan when humidity exceeds the upper limit, can be enabled on the card (human review recommended before enabling).',
  '<b>提示：</b>涉及加热类设备务必保留硬件温控保护，软件联动仅作辅助，不要作为唯一保护手段。':'<b>Note:</b> heating devices must keep their hardware thermal protection; software linkage is auxiliary only and must not be the sole safety measure.',
  '登录与同步均在本软件内完成，无需自建 Home Assistant；技术细节详见《调研-米家设备接入可行性》（当前版本为示例界面）。':'Sign-in and sync happen inside this app — no Home Assistant needed; see the feasibility memo for technical details (current version is a sample UI).',
  // —— v2.0 硬件接入 / 本地接入 / 活动与环境分析 ——
  '硬件接入':'Hardware Access',
  '本地接入':'Local Devices','米家 IoT':'Mijia IoT',
  '生存分析':'Survival Analysis','活动分析':'Activity Analysis','环境分析':'Environment Analysis',
  '本机摄像头':'Local Camera','画面仅在本机处理 · 不经网络':'Processed on-device · never uploaded',
  '启动摄像头':'Start Camera','停止摄像头':'Stop Camera','运行中':'Running','未启动':'Not started','记录中':'Recording','摄像头未启动':'Camera off',
  '活跃度指数（AI）':'Activity Index (AI)','活动虫数（估计）':'Active mosquitoes (est.)','监测时长':'Duration',
  '多路接入本机摄像头同时监测多笼：每路画面独立分析（降采样 192×144、约 10 fps），红色覆盖为算法识别的运动区域；设备可固定绑定蚊笼，监测会话自动继承绑定。活动度算法已通过合成真值自动验证（计数 MAE ≤ 1.5、活跃度线性 R² ≥ 0.9、昼夜节律 r ≥ 0.85）。开始记录时将同步录制摄像头画面（WebM），停止记录后自动下载留存；视频同样仅在本机生成。外接温湿度传感器的本机读取将在后续版本提供，当前可使用「米家 IoT」页签的自动采集。':'Connect multiple local cameras to monitor several cages at once: each feed is analyzed independently (downsampled to 192×144, ~10 fps) and the red overlay marks motion regions detected by the algorithm. Devices can be bound to cages, and sessions inherit the binding automatically. The activity algorithm passed synthetic ground-truth validation (count MAE ≤ 1.5, activity linearity R² ≥ 0.9, circadian rhythm r ≥ 0.85). Starting a recording also captures camera video (WebM), which is auto-downloaded for archiving when the recording stops; the video is likewise generated on-device only. On-device reading of external temp-humidity sensors will come in a later version; use auto-logging on the "Mijia IoT" tab for now.',
  '添加摄像头':'Add Camera','全部关闭':'Stop All','选择设备…':'Choose a device…','设备':'Device','停止':'Stop',
  '视频':'Video',
  '暂未添加摄像头：从上方选择设备并点「添加摄像头」。':'No cameras yet: pick a device above and click "Add Camera".',
  '请先为该摄像头绑定蚊笼':'Bind a cage to this camera first',
  '摄像头':'Camera','该摄像头已添加':'This camera is already connected','请先选择设备':'Pick a device first',
  '当前环境不支持摄像头':'Camera not supported in this context','无法枚举摄像头设备':'Unable to enumerate camera devices',
  '已获得摄像头权限，请再次点「添加摄像头」':'Camera permission granted — click "Add Camera" again',
  '记录入口在各摄像头卡片上，会话自动继承该设备绑定的蚊笼':'Recording is started from each camera card; sessions inherit that camera\'s cage binding',
  '多路接入 · 画面仅在本机处理':'Multi-camera · processed on-device',
  '活动监测会话':'Activity Sessions','每秒采样 · 可导出 CSV':'1 s sampling · CSV export',
  '绑定蚊笼':'Linked cage','开始记录':'Start Recording','停止并保存':'Stop & Save',
  '监测会话列表':'Session List','来自「硬件接入 → 本地接入」的监测会话':'Sessions from Hardware Access → Local Devices','选择会话':'Select session',
  '会话':'Session','开始时间':'Start Time','时长':'Duration','平均AI':'Mean AI','峰值AI':'Peak AI','平均虫数':'Mean count','查看':'View','导出':'Export',
  '监测会话':'Sessions','累计监测时长':'Total duration','平均活跃度 AI':'Mean AI','峰值活跃度 AI':'Peak AI',
  '暂无监测会话：启动摄像头并点「开始记录」后，将在此列出监测会话。':'No sessions yet: start the camera and click "Start Recording"; sessions will be listed here.',
  '请先启动摄像头':'Start the camera first',
  '暂无在养蚊笼：请先在「蚊笼管理」新建':'No open cages: create one in Cage Management first',
  '记录过短，已丢弃（至少 3 秒采样）':'Recording too short — discarded (min. 3 s of samples)',
  '当前环境不支持摄像头访问（需 https 或本机文件打开）':'Camera not available in this context (requires https or opening the local file)',
  '摄像头不可用：请检查系统隐私设置与浏览器授权':'Camera unavailable: check system privacy settings and browser permission',
  '活跃度指数 AI':'Activity Index (AI)','活动虫数':'Active count','阈值':'threshold',
  '各蚊笼温度带（环境记录均值）':'Temperature bands by cage (mean of env. records)',
  '温度区间与累积存活率（已结束蚊笼）':'Temperature band vs. cumulative survival (closed cages)',
  '湿度分布（环境记录）':'Humidity distribution (env. records)',
  '暂无环境记录：录入环境记录或接入米家温湿度传感器后，此处将自动生成环境分析。':'No env. records yet: analysis appears here after logging env. records or linking Mijia temp-humidity sensors.',
  '仅呈现相关性，不构成因果结论；样本较少时请谨慎解读。':'Correlation only, not causation; interpret small samples with care.',
  '环境记录可来自手动录入或「米家 IoT」温湿度传感器自动采集。':'Env. records come from manual entry or auto-logging by Mijia temp-humidity sensors.',
  '— 新增「硬件接入 → 本地接入」：本机摄像头多路接入，每路独立实时蚊虫活动度分析（运动能量 + 目标计数双指标算法，阈值自适应、画面仅在本机处理），设备固定绑定蚊笼，支持监测会话管理与 CSV 导出；统计分析升级为多页签（生存分析 / 活动分析 / 环境分析），环境分析新增蚊笼温度带、温度–存活率关联与湿度概览；原 IoT 接入内容并入「米家 IoT」页签。':' — New "Hardware Access → Local Devices": multi-camera on-device mosquito activity analysis (motion-energy + target-count dual-index algorithm, adaptive thresholds, video never leaves the PC), each camera bound to a cage, with monitoring sessions and CSV export; Statistics upgraded to tabs (Survival / Activity / Environment analysis) adding cage temperature bands, temperature–survival association and humidity overview; previous IoT content moved into the "Mijia IoT" tab.'
};
function tr(s){ return LANG === 'en' && I18N[s] ? I18N[s] : s; }
function T(zh, en){ return LANG === 'en' ? en : zh; }
function applyLang(){
  document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN';
  document.title = T('MosqCare 蚊媒饲养工作台 · v2.2', 'MosqCare Mosquito Rearing Workbench · v2.2');
  var skipIds = ['tab-overview', 'tab-design', 'tab-detail', 'tab-rules'];
  function inSkip(el){ var q = el; while (q && q !== document.body){ if (skipIds.indexOf(q.id) >= 0) return true; q = q.parentElement; } return false; }
  var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false), nodes = [];
  while (w.nextNode()){
    var n = w.currentNode;
    if (!n.parentElement || inSkip(n.parentElement)) continue;
    var cur = n.nodeValue.trim();
    if (!cur) continue;
    if (n.__zh === undefined) n.__zh = cur;
    var tgt = (LANG === 'en' && I18N[n.__zh]) ? I18N[n.__zh] : n.__zh;
    if (n.nodeValue !== tgt) nodes.push([n, tgt]);
  }
  nodes.forEach(function(p){ p[0].nodeValue = p[1]; });
  ['placeholder', 'title'].forEach(function(attr){
    document.querySelectorAll('[' + attr + ']').forEach(function(el){
      if (inSkip(el)) return;
      if (el['__' + attr] === undefined) el['__' + attr] = el.getAttribute(attr);
      var v = el['__' + attr];
      var tgt = (LANG === 'en' && I18N[v]) ? I18N[v] : v;
      if (el.getAttribute(attr) !== tgt) el.setAttribute(attr, tgt);
    });
  });
  var lr = document.getElementById('lang-region'); if (lr) lr.style.display = MC_LANG_LOCK ? 'none' : '';
  var bzh = document.getElementById('lang-zh'), ben = document.getElementById('lang-en');
  if (bzh && ben){
    bzh.style.background = LANG === 'zh' ? '#2563eb' : '#fff'; bzh.style.color = LANG === 'zh' ? '#fff' : '#1d4ed8';
    ben.style.background = LANG === 'en' ? '#2563eb' : '#fff'; ben.style.color = LANG === 'en' ? '#fff' : '#1d4ed8';
  }
}
function setLang(l){
  if (MC_LANG_LOCK) return;
  LANG = l;
  try { localStorage.setItem('mcLang', l); } catch(e){}
  applyLang(); renderAll(); navigate(state.page);
}
