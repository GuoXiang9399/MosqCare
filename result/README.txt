MosqCare v3.0 · result/ 结果留存目录

- videos/    监测视频留存（停止记录后自动写入，命名：MosqRec_<蚊笼号>_<日期-时间>.webm）
- exports/   导出结果留存（CSV 导出时自动同步写入本目录）
- sessions.json  监测会话数据（软件实时写入，启动时自动恢复）

桌面版（Tauri）说明：
- 安装目录下会自动生成 data/ 与 result/，全部记录实时写入本地，关闭软件不丢失。
- data/      品系、蚊笼、预警数据（strains.json / cages.json / alerts.json）
- result/    监测会话、视频、导出文件
- 用户可将软件导出的「品系档案 CSV」「蚊笼列表 CSV」放入 data/，下次启动自动读取合并。

浏览器预览模式：无本地落盘，视频与导出走浏览器下载。
