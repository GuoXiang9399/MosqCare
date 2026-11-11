# MosqCare 蚊媒饲养工作台 / MosqCare Mosquito-Rearing Workbench

**MosqCare 蚊媒饲养工作台** · v3.4 — 面向个人 / 小实验室的蚊虫饲养过程管理工具：记录、统计、分析、可视化。单机使用，无账号体系。

**MosqCare** · v3.4 — A process-management tool for mosquito rearing in personal / small laboratories: recording, statistics, analysis and visualization. Runs standalone; no account required.

开发者 / Developer：河南大学基础医学院 / 河南大学深圳研究院 郭祥
School of Basic Medical Sciences, Henan University / Shenzhen Research Institute, Henan University.

---

## 功能特性 / Features

- **品系档案 / Strain records**：蚊株信息、代际关系树状展示、关联蚊笼追踪，支持 CSV 导入 / 导出。
  Strain information, generation lineage tree, linked-cage tracking; CSV import / export supported.
- **蚊笼管理 / Cage management**：以蚊笼为单位的饲养全流程——建立蚊笼、饲喂、环境记录、阶段计数、实验处理，卡片式生命周期视图与到期提醒。
  Cage-centric full workflow — cage setup, feeding, environment logs, stage counts and experimental treatments; card-based lifecycle view with due reminders.
- **预警闭环 / Alert loop**：饲喂超时、换笼超期、温湿度越限、存活率异常等自动预警，仅预警 + 处理建议，无需处置表单。
  Automatic alerts for overdue feeding / cage change, out-of-range temperature & humidity and abnormal survival; alerts come with handling suggestions only — no disposition forms.
- **统计分析 / Analytics**：生存分析、活动分析（多页签）、阶段转化率、月度产出趋势、世代对比与预警统计。
  Survival analysis, activity analysis (tabbed), stage transition rates, monthly yield trends, generation comparison and alert statistics.
- **硬件接入 / Hardware integration**：
  - 米家 IoT：软件内登录小米账号一键同步温湿度传感器与插座（内置小米官方集成内核，无需自建 Home Assistant）。
    Mijia IoT: sign in with a Xiaomi account to sync temperature / humidity sensors and smart plugs (official Xiaomi integration built in — no Home Assistant needed).
  - 本地摄像头：本机摄像头多路接入，每路独立实时蚊虫活动度分析（运动能量 + 目标计数双指标，阈值自适应，画面仅在本机处理），支持监测会话管理与视频录制留存。
    Local webcams: multi-camera capture with per-camera real-time mosquito activity analysis (motion energy + target count, adaptive thresholds; frames stay on the local machine), with monitoring sessions and recorded video retained.
- **数据落盘 / Local persistence**：安装目录自动生成 `data/`（品系、蚊笼、预警）与 `result/`（监测会话、`videos/` 视频、`exports/` 导出文件），所有记录实时写入本地，关闭软件不丢失；启动自动恢复；用户放入 `data/` 的品系档案 / 蚊笼列表 CSV 也会被读取合并。
  The app creates `data/` (strains, cages, alerts) and `result/` (monitoring sessions, `videos/`, `exports/`) under its install directory; every record is written locally in real time and survives restarts. Data loads automatically on startup, and user-provided strain / cage CSV files placed in `data/` are read and merged.
- **系统托盘 / System tray**：关闭窗口后台驻留，右下角托盘图标常驻入口（左键显示主界面，菜单可退出）。
  Closing the window keeps the app resident in the background with a tray icon (left-click to show the main window; menu to quit).
- **单页饲养报告 / One-page rearing report**：AeLabStr 模板改编的 A4 可打印报告，隐藏界面元素、表头居中、边距优化。
  A4-printable report adapted from the AeLabStr template, with UI chrome hidden, centered headers and optimized margins when printed.
- **中英双语 / Bilingual UI**：界面支持中英切换（中文版安装包锁定中文）。
  Interface switches between Chinese and English (the CN installer locks Chinese).

## 目录结构 / Directory layout

```
index.html                  单页应用入口 / Single-page app entry
script/
  app.js                    应用逻辑 / Application logic
  i18n.js                   中英词典 / Bilingual dictionary
  persistence.js            桌面版本地落盘 / Desktop local persistence
  algo/registry.js          算法版本注册 / Algorithm registry
  algo/activity.v0.1.js     活动度分析算法 v0.1 / Activity analysis v0.1
data/preset/demo.js         内置示例数据 / Built-in demo data
result/README.txt           结果目录说明 / Notes about result/
```

运行版安装后额外生成 / Created after installation at runtime:

```
data/    strains.json · cages.json · alerts.json（实时写入 / written in real time）
result/  sessions.json · videos/（监测视频 / monitoring videos） · exports/（CSV 留存 / retained CSV exports）
```

## 安装与运行 / Install & run

- **Windows 安装包 / Windows installer**：提供完整版（中英双语）与中文版两个 NSIS 安装包，当前用户级安装，无需管理员权限。
  Two NSIS installers are provided — Full (bilingual) and CN (Chinese-locked); per-user install, no administrator rights required.
- **绿色版 / Portable**：直接用浏览器打开 `index.html` 即可使用（浏览器模式下视频留存为下载文件，数据存于 localStorage）。
  Open `index.html` directly in a browser for portable use (in browser mode videos are saved as downloads and data lives in localStorage).
- 桌面版基于 Tauri 2 构建（Rust 后端 + WebView2），支持数据落盘、系统托盘与摄像头录制。
  The desktop edition is built on Tauri 2 (Rust backend + WebView2), enabling local persistence, the system tray and camera recording.

## 数据导入 / Data import

设置页支持导入品系档案 / 蚊笼列表 CSV（应用导出的同格式文件），也可直接把导出的 CSV 放入安装目录 `data/` 文件夹，下次启动自动合并。默认无数据；「导入预设数据」载入内置示例，便于快速了解功能。

The Settings page imports strain / cage CSV files (same format as the app's exports); you can also drop exported CSVs straight into the `data/` folder under the install directory and they will be merged on next launch. The app starts empty; use "Import demo data" to load the built-in sample and explore the features.

## 技术栈 / Tech stack

原生 HTML / CSS / JavaScript（无框架）· Tauri 2 · Rust（serialport / tray-icon）· Canvas 2D 图表 · IndexedDB / localStorage · WebRTC（摄像头）· MediaRecorder（视频）
Vanilla HTML / CSS / JavaScript (no framework) · Tauri 2 · Rust (serialport / tray-icon) · Canvas 2D charts · IndexedDB / localStorage · WebRTC (camera) · MediaRecorder (video)

## 更新日志 / Changelog

完整更新日志（与软件「关于」页一致）。Complete changelog, identical to the in-app About page.

### v3.4 · 2026-11-10 — 感知扩展 / Perception extension

- ① TEMPer USB 温度计直插（HID）：桌面版经自研纯 Rust HID 命令枚举 / 读取 PCsensor TEMPer 家族设备（免驱动、零 C 编译依赖），接入方式新增「USB 直插（HID）」，与 RS485 总线并存，读数同样进入实时曲线、阈值预警与 `result/env_*.json` 留存。
- ② Modbus 扩展参数设备：探头类型由温湿度扩展为四类（温湿度 / CO₂ / 光照度 / 负压），寄存器起始地址与倍率可按设备说明书修改，CO₂ 超阈值自动生成预警。
- ③ 继电器联动建议条：温度 / 湿度 / CO₂ 偏离阈值时在监测卡片区内联给出风扇降温、加热保温、加湿、通风除湿、通风换气建议（连续两轮命中同一组合才显示；仅作页内建议，不下发任何控制指令，不进预警中心）。
- ④ 科研分析新增「Brière 发育速率拟合」：复用发育校准样本拟合非线性发育速率曲线 r(T) = c·T·(T−T₀)·(T_L−T)^0.5（对 (T₀, T_L) 做 0.5℃ 网格搜索、c 取过原点最小二乘解析解），与同样本线性积温回归 r² 对比呈现，样本 <4 个或温度跨度 <5℃ 时诚实拒绝拟合，r²<0.5 标记拟合较弱；算法独立注册为 briere v0.1（`script/algo/briere.v0.1.js`）。
  EN: TEMPer USB HID thermometers plugged directly; probe types expanded to four Modbus classes (temp/RH / CO₂ / light / negative pressure) with CO₂ alerts; inline relay action suggestions (page-inline only, no control commands ever sent); Brière development-rate fit added to research analytics (briere v0.1).

### v3.3 — 饲养结果预测（积温模型 GDD） / Rearing outcome forecasting

- 新增发育预测模块（算法独立注册为 forecast v0.1，`script/algo/forecast.v0.1.js`）——① 蚊笼详情新增「发育预测」卡：线性积温模型（GDD = Σ max(0, T̄日 − T₀)，超过上限发育温度按上限截断）逐日累计笼环境温度有效积温，内置文献热常数按品系拉丁名自动匹配（埃及伊蚊 T₀=8.3℃/K=181.2 日·度、白纹伊蚊幼虫期 K=105.26 + 卵/蛹期假设补偿、斯氏按蚊 K=187.7/上限 38℃ 截断、尖音库蚊复合群雌雄均值），给出预计羽化日倒计时、积温轨道进度与实际阶段进度双轨对比；环境记录缺失日顺延前值、连续缺失超 3 天或无记录按 26℃ 假设计入并标注覆盖率。
- ② 发育偏差预警：积温轨道进度与实际阶段推进（卵→成虫六级序）偏差超阈值自动生成预警（临近羽化 / 超前 / 迟缓，分提示与警告两级），并给出温度、密度、饲料、水质排查建议。
- ③ 科研分析（生存分析页签）新增「预测参数校准」：同品系已结束蚊笼 1/D × 平均温度线性回归（发育起点 T₀ 与有效积温 K），有效样本 ≥6 笼启用本地校准并覆盖文献默认值，界面明示文献值/校准值来源；「羽化产量区间」：同品系已结束笼累积存活率 P10/P50/P90 分位 × 在养笼起始卵量的产量区间估计，样本 ≥10 批次才显示。
- ④ 全部预测附带诚实脚注：相关性非因果预测、基于笼环境温度（幼虫实际受水温驱动）、文献热常数存在株间差异（±20–30%）、未纳入密度/饲料/水质等因子。
  EN: GDD development forecasting with literature thermal constants (forecast v0.1); development-deviation alerts with troubleshooting tips; forecast parameter calibration (T₀ / K) and emergence yield intervals in research analytics; honest footnotes on all forecasts.

### 补完 v3.1 既定计划 — 多探头串口监测 / Multi-probe serial monitoring

- USB 串口环境监测升级为多探头：同一 RS485 总线手拉手接入多台变送器（各自设置不同从站地址），「探头列表」登记后每 5 秒按从站地址顺序轮询全部探头（RS485 半双工 Promise 链不可并发），探头列表本地记忆；新增多探头实时温湿度曲线（最近 12 分钟窗口，左轴温度自适应 + 阈值带、右轴湿度 0–100%，实线温度 / 虚线湿度，各探头配色区分）；新增标准限值模板一键套用（常规饲养 / WHO 成蚊接触测定 25±2℃·80±10%RH / WHO 瓶测定 27±2℃ / IAEA 伊蚊规模化饲养 26±1℃·70±5%RH，套用后可在预警阈值中微调）；新增血饲-产卵日历提醒（FAO/IAEA：血饲后约 3 天产卵，按最近一次血饲记录自动推算预计产卵日并生成提示级预警，收集到子笼后自动关闭）；预警中心支持「提示」级样式。
  EN: multi-probe RS485 polling with a live temp/RH chart; one-click standard-limit presets (routine / WHO contact & bottle assays / IAEA mass-rearing); blood-feed → oviposition calendar reminder; "notice" alert level in the Alert Center.

### v3.2 — 科研分析融合 / Research analytics suite

- 生存分析页签内新增科研分析区——① KM 生存曲线（生命表法，按品系池化已结束蚊笼，结笼未死亡个体按删失处理）与两组 log-rank 检验（χ² 与 p 值）；② 池化阶段生命表（l_x / d_x / 100q_x）与表观净繁殖率 R₀、世代均时 T、内禀增长率 rₘ（近似估算）、周限增长率 λ、倍增时间 DT 自动计算；③ 各分析导出全面科研化：生存分析提供生存长表 CSV（R survival / Python lifelines 即用）、生命表 CSV 与 Prism 宽表模板 CSV（每笼一行、列式排布，GraphPad 直接导入），活动分析新增昼夜节律汇总 CSV；④ 活动分析新增昼夜节律图（全部监测会话按一天 24 小时聚合的活跃度指数分布，标注峰值时段，光相 / 暗相均值对比）；算法独立注册为 research v0.1 模块（`script/algo/research.v0.1.js`），便于迭代与复现。
  EN: KM survival curves with log-rank tests, pooled life tables with R₀ / rₘ / λ / DT, research-grade CSV exports (R / lifelines / Prism templates), and a circadian activity chart (research v0.1).

### v3.0 — 环境因子硬件接入（一期） / Hardware environment sensing (phase 1)

- 新增「硬件接入 → USB 串口」页签，通过 USB 转 RS485 适配器直连 Modbus RTU 温湿度变送器（8-N-1，SHT 系列默认寄存器映射：0x0000 湿度、0x0001 温度，0.1 倍率），支持串口扫描、波特率与从站地址配置、每 5 秒轮询实时温湿度读数；读数超出阈值自动生成预警；监测读数留存 `result/env_*.json`（桌面版）；内置模拟读数模式，无硬件也可演示全流程；接入指南同步更新。
  EN: USB-RS485 + Modbus RTU temp-humidity transducers with 5 s polling, threshold alerts and env-data persistence; built-in simulation mode.

### v2.2 — 数据本地落盘 / Local persistence

- 安装目录自动生成 `data/`（品系、蚊笼、预警）与 `result/`（监测会话、视频、导出文件），所有记录实时写入本地，关闭软件不丢失；监测视频默认留存 `result/videos/` 并可导出；CSV 导出同步留存 `result/exports/`；启动自动恢复上次数据，用户放入 `data/` 的品系档案 / 蚊笼列表 CSV 也会被读取合并；新增系统托盘：关闭窗口后台驻留，右下角托盘图标常驻入口（左键显示主界面，菜单可退出）；安装改为当前用户级（无需管理员权限）；单页报告打印版式优化（打印页隐藏弹窗标题栏、A4 页边距收紧、表头居中不换行、日期列单行、未填写操作人留空）。
  EN: real-time local persistence (`data/` + `result/`), system tray, user-CSV loading, per-user install and print layout tuning.

### v2.1 — 录制与导出实装 / Recording & exports

- 修复本地接入预览黑屏（显示画布未逐帧绘制）；监测记录新增同步录制摄像头视频（WebM，停止记录后自动下载留存）；CSV 导出全面实装（蚊笼列表/全部管理记录、品系档案含关联蚊笼与代际分布、品系代际关系、统计分析、预警中心）；工程结构拆分为 index.html + `script/`（i18n、算法、应用）+ `data/`（预设数据）+ `result/`（结果留存），算法版本化注册便于迭代与复现。
  EN: preview fix, session video recording (WebM), six CSV exports, and project split with version-registered algorithms.

### v2.0 — 本地摄像头接入 / Local camera capture

- 新增「硬件接入 → 本地接入」：本机摄像头多路接入，每路独立实时蚊虫活动度分析（运动能量 + 目标计数双指标算法，阈值自适应、画面仅在本机处理），设备固定绑定蚊笼，支持监测会话管理与 CSV 导出；统计分析升级为多页签（生存分析 / 活动分析 / 环境分析），环境分析新增蚊笼温度带、温度–存活率关联与湿度概览；原 IoT 接入内容并入「米家 IoT」页签。
  EN: multi-camera local capture with per-camera real-time activity analysis; tabbed analytics with environment insights.

### v1.8 — 双语与安装包 / Bilingual UI & installers

- 界面支持中英双语，可在设置页切换显示语言；正式发布 Windows 桌面安装包，分完整版（中英双语）与中文版（锁定中文）两个版本。
  EN: bilingual UI (switch in Settings) and the first Windows desktop installers (Full / CN).

### v1.7 — 内置米家连接器 / Built-in Mijia connector

- IoT 改为内置米家连接器（内嵌小米官方集成内核）：小米账号在软件内登录、一键同步设备，无需自建 Home Assistant（HA 降为可选高级路径）；界面改为全屏软件预览；发布版：默认无数据、设置支持导入 / 删除预设数据，新增记录重构为「饲喂 / 环境 / 阶段计数 / 实验处理」分组，去除冲正机制，虫态图标改为二次元萌系风格，生命周期卡片可读性优化。
  EN: official Xiaomi integration built in (no Home Assistant needed), full-screen software preview, empty-by-default data with preset import, grouped record forms and cute stage icons.

### v1.6 — 预警简化与指南 / Alert simplification & guides

- 界面去演示化标注；预警简化为「只预警 + 处理建议」（取消处置表单）；IoT 三类设备各附接入指南；蚊笼详情新增编辑 / 删除蚊笼；规划 Windows 桌面安装包。
  EN: demo labels removed; alerts simplified to warn + suggestion; per-device IoT guides; cage edit/delete; Windows installer planned.

### v1.5 — IoT 接入面板 / IoT panel

- 新增「IoT 接入」面板（F12）：温湿度传感器自动采集写环境记录、摄像头实时画面与快照、插座开关远程控制；接入经 Home Assistant 中转（设备链路待接入）。
  EN: first IoT panel (F12) — sensor data into environment logs, camera live view & snapshots, plug control via Home Assistant.

### v1.4 — 卡片体验优化 / Card UX polish

- 卡片图标卡通化并调大；多阶段并行显示（并存阶段徽章）；卡片等高、按钮贴底；预警阈值移至预警中心；品系档案与蚊笼管理支持 CSV 导入 / 导出；统计新增阶段转化率与月度产出趋势。
  EN: cartoon icons, parallel-stage badges, equal-height cards, alert thresholds moved to Alert Center, CSV import/export, transition-rate and monthly-trend stats.

### v1.3 — 品系信息完善 / Strain info

- 品系物种 / 蚊株信息可编辑；代系关系改树状展示（支持一笼扩繁多个子代）；生命周期进度一屏显示；统计卡片分组；报告表头简化。
  EN: editable species/strain info, lineage tree with multi-offspring expansion, one-screen lifecycle progress, grouped stat cards.

### v1.2 — 报告与导出 / Report & exports

- 单页饲养报告（AeLabStr 模板改编）；设置页；关于；各面板导出 CSV；品系代系关系与关联蚊笼；统计增加世代对比与预警统计。
  EN: one-page rearing report (AeLabStr-based), Settings & About pages, CSV exports, lineage links and comparison stats.

### v1.1 — 视觉与结构 / Visual & structure

- 蓝色主题；以蚊笼为单位；图形化虫态卡片；预警直接标注在蚊笼卡片上；品系档案独立栏目。
  EN: blue theme, cage-centric model, graphical stage cards, alerts on cage cards, dedicated strain section.

### v1.0 — 首版 / First release

- 首版：四类记录、预警闭环、统计分析、交互式 PRD。
  EN: first release — four record types, the alert loop, analytics and an interactive PRD.

## 许可与引用 / License & citation

本项目由河南大学基础医学院 / 河南大学深圳研究院开发，仅供科研使用。引用请注明出处。
Developed by the School of Basic Medical Sciences, Henan University / Shenzhen Research Institute, Henan University, for research use only. Please cite the source when reusing.
