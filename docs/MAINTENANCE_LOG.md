# MenuorgPrint 维护记录

## 2025-10-23 · 打包矩阵与兼容性治理
- **交付**：调整 electron-builder 配置，新增多架构产物脚本（x64/ia32/arm64）、Win10+ Web 安装器以及 Windows 7/8 兼容构建配置；生成产物命名规范为 `MenuorgPrint-win32-<arch>-<version>.exe`，兼容包输出至 `dist/legacy/`。
- **核心构建**：新增 `npm run build:core` 轻量打包流程（dist/core），默认禁用自动更新，仅保留登录、打印配置与自动打印核心功能。
- **优化**：默认启用 ASAR 与 maximum 压缩等级，排除文档/日志/缓存目录以缩小安装包体积，同时禁用 npm rebuild。
- **运行改进**：主进程新增低资源模式与缓存调优（清理 + 32MB 限额），限制渲染进程拼写检查，暴露 `electronAPI.getCompatibilityInfo` 以便前端识别推荐构建。
- **兼容性**：启动时记录 Windows 版本并输出推荐脚本，检测到 Windows 10 以下版本时提示切换 legacy 包。
- **脚本**：新增 `npm run build:win:*`、`npm run build:win10`、`npm run build:legacy` 供 CI/手动选择目标。
- **文档**：补充《Release & Update 指南》，梳理多架构发布及自动更新步骤。

记录关键交付、问题修复与未完事项，便于后续迭代追踪。

## 2025-08-01 · 性能治理体系上线
- **交付**：引入 `src/performance-utils.js`、重构 `renderer/js/websocket-optimized.js` 与 `renderer/js/app.js`，提供事件/定时器托管、缓存、内存监控、防抖节流、指数退避等能力；新增 `renderer/performance-test.html` 作为性能仪表盘。
- **背景**：解决鼠标事件泄漏、定时器失控、阻塞式初始化等严重性能问题，确保 24/7 稳定运行。
- **验证**：完成语法检查（`node -c`）、基线测试脚本，建议手动执行性能面板的压力测试与长期运行观察。
- **遗留任务**：按照 性能优化清单 将优化后的 WebSocket 客户端与性能管理器全面替换旧实现，完成打印管线的事件/定时器清理审核。

## 2025-08-01 · CLodop 增强管理器与启动优化
- **交付**：`src/enhanced-clodop-manager.js`、`src/clodop-connection-manager.js`、`renderer/js/printer-manager.js` 升级，补充系统启动识别、分层重试、结果缓存、事件总线、远程日志等功能；新增 `test-enhanced-clodop.html` 作为调试工具。
- **关键特性**：支持开机自启场景延迟策略、多端口探测、强制刷新、事件监听、重连 API；`preload.js` 暴露 `getSystemStartupInfo` 帮助渲染层做策略调整。
- **测试建议**：通过 `test-enhanced-clodop.html` 模拟连接流程、触发事件；在真实机器上执行开机自启 + 打印链路联调。
- **注意事项**：保持 CLodop 版本更新，必要时清理缓存或重启服务；关注日志中 `[EnhancedCLodop]` 前缀的异常信息。

## 2025-08-01 · 热敏票据与 PrintType 分菜打印
- **交付**：`src/printer-lodop.js` 完成专业热敏排版、宽度自适应、金额对齐、长文本换行、费用区块；`renderer/js/printer-manager.js` 支持 `printer_type` 拆单与兜底策略；新增 `test-printtype.html`、`test-professional-layout.html` 等示例。
- **业务效果**：满足多打印机厨房分工、收银整单复核、预付标识等餐饮场景需求；支持 58/80mm 等多规格纸宽与中英混排。
- **验证**：使用 `test-printtype.html` 配置不同打印机编号并模拟订单；在真实打印机上对比 现行专业模板 中的预期排版。
- **持续改进**：为 PrintType 配置持久化与 UI 管控提供接口；考虑将测试页面整合进正式界面或运维面板。

## 2025-08-01 · 自动更新与发布流程优化
- **交付**：`src/auto-updater.js` / `renderer/js/update-manager.js` 增强用户提示、错误分级、日志记录；`set-github-token.ps1`、原自动更新问题排查文档 指导发布首个 Releases；安装器脚本 `installer/installer-script.nsh` 完整同步开机自启选项。
- **流程梳理**：`npm version` 调整版本 → `npm run build`/`npm run publish` 打包上传 GitHub Releases → 应用端自动检测、下载、重启。
- **已知问题**：若 Releases 为空会提示“暂无发布版本”，需先发布正式包；开发模式下更新仅模拟流程。
- **维护建议**：保持 `GH_TOKEN` 有效并带 `repo` 权限；发布前验证 `MenuorgPrint Setup x.y.z.exe` 是否正确上传。

## 2025-08-01 · 桌面体验与单实例对话框
- **交付**：`main.js` 增加程序已运行提示框、详细信息面板、托盘开关、配置持久化、开机自启验证；文档 原功能方案文档 与 原测试用例文档 记录设计与测试流程。
- **用户体验**：重复启动时可一键切回主窗口、查看运行状态、静默关闭提示；托盘菜单涵盖展示/隐藏、开机自启、更新检查等操作。
- **验证**：参考 原测试用例文档 执行多实例、托盘开关、边界状态测试；检查 `%APPDATA%/MenuorgPrint/config.json` 是否及时更新。
- **风险提示**：确保托盘图标与通知资源存在（`assets/icon.ico`）；配置异常时默认回退为启用提示。

## 持续关注 & TODO
- **性能清单**：完成 性能优化清单 中剩余项，尤其是打印模块的事件/定时器收口。
- **打印配置持久化**：为 PrintType 编号、编码偏好、模板选择提供本地/远端存储方案。
- **运维面板整合**：考虑在主界面内嵌调试与维护工具，取代零散测试 HTML。
- **发布流程自动化**：可加入 CI/CD，自动构建安装包并上传 Releases，减少人工操作。
- **日志与监控**：结合 `MemoryMonitor` 输出定期报告，必要时补充远程收集与告警机制。


