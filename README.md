# MosqCare 蚊媒饲养工作台 / MosqCare Mosquito-Rearing Workbench

**MosqCare 蚊媒饲养工作台** · v2.2 — 面向个人 / 小实验室的蚊虫饲养过程管理工具：记录、统计、分析、可视化。单机使用，无账号体系。

**MosqCare** · v2.2 — A process-management tool for mosquito rearing in personal / small laboratories: recording, statistics, analysis and visualization. Runs standalone; no account required.

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

## 版本历史 / Version history

| 版本 / Ver. | 主要更新 / Highlights |
|---|---|
| v2.2 | 数据本地落盘（data/ + result/）、系统托盘、读取用户 CSV、报告打印版式优化 / Local persistence (data/ + result/), system tray, user-CSV loading, print layout tuning |
| v2.1 | 本地预览黑屏修复、监测视频录制留存、六类 CSV 导出、工程拆分 / Preview fix, session video recording, six CSV exports, project split |
| v2.0 | 本地摄像头多路接入 + 实时活动度分析、统计多页签 / Multi-camera local capture with real-time activity analysis, tabbed analytics |
| v1.8 | 中英双语、Windows 桌面安装包 / Bilingual UI, Windows desktop installers |
| v1.0–1.7 | 记录 / 预警 / 统计 / 报告 / IoT 等基础能力迭代 / Iterations of core recording, alerting, analytics, reporting and IoT features |

## 许可与引用 / License & citation

本项目由河南大学基础医学院 / 河南大学深圳研究院开发，仅供科研使用。引用请注明出处。
Developed by the School of Basic Medical Sciences, Henan University / Shenzhen Research Institute, Henan University, for research use only. Please cite the source when reusing.
