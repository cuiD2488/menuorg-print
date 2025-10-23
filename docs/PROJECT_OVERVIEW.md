# MenuorgPrint 项目总览

## 项目定位
MenuorgPrint 是一套面向餐饮场景的桌面打印解决方案，基于 Electron 与 CLodop 打印服务构建，支持热敏小票打印、分台分菜联动、自动更新以及开机自启等运营必需特性。项目已经完成全面性能优化，能够长期稳定运行在 Windows 7/10/11 环境。

## 核心能力概览
- **热敏打印全流程**：支持 58/80mm 等多规格纸宽，提供专业排版、中文编码增强、PrintType 分菜打印、自动重试与降级策略。
- **增强版 CLodop 管理**：`src/enhanced-clodop-manager.js` 结合系统启动时序检测、智能缓存和多通道心跳检查，确保打印引擎可用。
- **设备与编码智能识别**：`renderer/js/printer-manager.js` 集成中文编码探测、打印机兼容性打分、批量测试与报告导出功能。
- **桌面级体验**：主进程 `main.js` 提供单实例锁、已运行提示对话框、托盘菜单、开机自启同步、系统通知等完整体验。
- **自动更新与分发**：`src/auto-updater.js` + `renderer/js/update-manager.js` 负责版本检测、包下载、重启安装；配合 `installer/installer-script.nsh` 与 `npm run publish` 完成发布闭环。
- **性能与监控工具链**：`src/performance-utils.js`、`renderer/js/websocket-optimized.js` 以及 `renderer/performance-test.html` 构成性能治理体系，涵盖事件/定时器托管、缓存、内存监控和调试面板。

## 技术栈与依赖
- 桌面框架：Electron 22.3.27
- 前端：原生 HTML/CSS/JavaScript
- 打印引擎：CLodop (C-Lodop) + ESC/POS 指令集
- 通信协议：WebSocket（优化客户端位于 `renderer/js/websocket-optimized.js`）
- 构建与发布：electron-builder、NSIS、自定义脚本 `set-github-token.ps1`
- 运行环境：Node.js 16+，Windows 7/10/11

## 项目结构速览
```text
├── main.js                     # 主进程入口，托盘/更新/打印桥接
├── preload.js                  # 预加载脚本，暴露安全 IPC API
├── src/
│   ├── auto-updater.js         # 自动更新管理器
│   ├── enhanced-clodop-manager.js
│   ├── clodop-connection-manager.js
│   ├── printer-lodop.js        # 主打印引擎（专业排版 + PrintType 支持）
│   ├── printer-lodop-original.js
│   ├── enhanced-websocket-client.js
│   └── performance-utils.js    # 事件/定时器/缓存/内存工具集合
├── renderer/
│   ├── index.html              # 主界面
│   ├── js/
│   │   ├── app.js              # 前端应用入口，整合性能工具
│   │   ├── printer-manager.js  # 打印流程控制
│   │   ├── printer.js          # 打印模型与格式化
│   │   ├── update-manager.js   # 更新 UI
│   │   ├── api.js              # IPC 封装
│   │   └── websocket-optimized.js
│   ├── LodopFuncs.js           # CLodop 全局函数适配
│   ├── css/
│   ├── debug-test.html         # 通用诊断面板
│   ├── print-maintenance-demo.html
│   └── performance-test.html   # 性能监控面板
├── installer/installer-script.nsh
├── assets/                     # 图标、安装包素材
├── dist/                       # 打包产物
└── docs/                       # 项目文档与维护记录
```

## 功能模块详解
### 1. 打印与编码体系
- **打印调度**：`renderer/js/printer-manager.js` 调用 `src/printer-lodop.js`，完成订单解析、排版、CLodop 任务调度与回退策略。
- **热敏排版**：专业票据模板涵盖标题居中、金额右对齐、长文本换行、费用分区与预付标识等商业需求。
- **PrintType 分菜打印**：允许为打印设备设置编号并按菜品 `printer_type` 分发任务（详见 `docs/MAINTENANCE_LOG.md` 2025-08-01 条目）。未匹配编号时自动归入整单打印，确保兜底。
- **中文编码增强**：整合 `ChineseEncodingDetector`（位于 `renderer/js/printer.js`）对文本进行类型识别、编码打分，支持 UTF-8/GBK/GB18030/BIG5 等多编码自动切换并输出兼容性报告。
- **CLodop 管理**：增强管理器针对开机自启场景提供系统启动时间识别、分层重试、端口 + 全局函数双通道检测、状态缓存与事件总线，显著提升连接成功率。

### 2. 自动更新与版本发布
- **更新能力**：支持开机自动检测、用户手动触发、后台下载、完成后提示重启。开发模式下会跳过真实安装但仍输出完整日志。
- **GitHub 发布流程**：
  1. 运行 `set-github-token.ps1` 写入 `GH_TOKEN`。
  2. 使用 `npm version <patch|minor|major>` 调整版本号。
  3. 执行 `npm run publish` 触发 electron-builder 打包并上传 GitHub Releases。
- **错误处理增强**：已对“仓库无 Releases”场景提供友好提示，并附带 `node test-github-connection.js` 连通性检测脚本。
- **安装包特性**：NSIS 安装器支持自定义目录、桌面/开始菜单快捷方式、开机自启选项；安装后生成的标记文件会被主进程读取以同步配置。

### 3. 桌面生命周期与用户体验
- **单实例控制**：`app.requestSingleInstanceLock()` 结合配置项 `showAlreadyRunningDialog`，重复启动时会弹出状态对话框，提供切换、静默继续、查看详情等操作。
- **托盘与菜单**：托盘菜单可切换窗口显示、启用/禁用开机自启、触发自动更新检查、控制“程序已运行提示”等。
- **配置持久化**：所有偏好存储在 `%APPDATA%/MenuorgPrint/config.json`，通过 `getConfig()` / `saveConfig()` 访问。
- **开机自启**：集成注册表 `Run` 项同步与 `--auto-start` 参数处理，支持在开发模式下进行模拟验证。
- **通知与对话框**：广泛使用 `Notification` 与 `dialog.showMessageBox` 提供关键路径反馈。

### 4. 性能治理与诊断
- **工具库**：`src/performance-utils.js` 内包含事件/定时器托管、智能缓存、内存监控、性能标记、批处理、节流防抖等组件，统一在渲染端消费。
- **WebSocket 客户端**：`renderer/js/websocket-optimized.js` 修复鼠标事件泄漏、实现指数退避重连、统一心跳与状态监控，并暴露给 `renderer/js/app.js`。
- **性能面板**：`renderer/performance-test.html` 展示内存曲线、事件监听器、定时器统计、缓存命中率，并包含压力/回归测试脚本。
- **维护示例**：`renderer/print-maintenance-demo.html` 演示保养流程，`renderer/debug-test.html` 用于验证日志输出、API 调用、批量打印模拟。

## 运行与构建
1. **安装依赖**
   ```bash
   npm install
   ```
2. **开发模式**
   ```bash
   npm run dev      # 热重载调试
   npm start        # 连接真实 CLodop
   ```
3. **构建与打包**
   常用脚本：
   ```bash
   npm run build            # 生成 dist/win-unpacked（按当前配置）
   npm run build:win:all    # 一次输出 x64/ia32/arm64 安装包
   npm run build:win:x64    # Windows 10/11 64 位安装包
   npm run build:win:ia32   # Windows 10（含 32 位设备）安装包
   npm run build:win:arm64  # Windows 11 on ARM 安装包
   npm run build:win10      # Win10+ 通用 Web 安装器（x64/arm64）
   npm run build:legacy     # Windows 7/8 兼容包（Electron 19，输出 dist/legacy）
   npm run publish          # 构建并上传 GitHub Releases
   ```
4. **运行环境要求**：需预先安装 CLodop 打印服务并确保目标打印机驱动就绪。

> ⚠️ Electron 22 仅支持 Windows 10/11。若需要兼容 Windows 7/8/8.1，请运行 `npm run build:legacy` 并分发 dist/legacy 下的安装包。
> 如需在低配设备上进一步降低资源占用，可在启动前设置环境变量 `MENUORG_DISABLE_GPU=1`。

## 配置与持久化要点
- `config.json`：保存开机自启、程序已运行提示、打印机偏好等布尔/时间戳字段。
- 安装器标记：`auto-start-enabled.flag` 等文件用于在首次启动时同步注册表状态。
- 打印机配置：PrintType 编号及编码偏好暂由 `printerManager` 内存保存，可根据业务需要扩展持久化方案。

## 关键工作流程
- **订单打印**：渲染端接收订单 → 调用 `printerManager.printOrder` → 自动选择编码/模板 → PrintType 拆单 → CLodop 队列打印 → 结果上报与错误回退（含重连、系统打印降级）。
- **自动更新**：启动或手动触发 → `auto-updater` 检查 GitHub Releases → 下载更新包 → 通知用户重启 → `app.relaunch()` 完成升级。
- **开机自启同步**：安装器写入注册表与标记 → 首次启动 `verifyAutoStartStatus` 校验 → 托盘菜单与设置面板可手动切换。
- **系统启动优化**：应用检测 `process.uptime()` 判断是否处于开机阶段，并调整 CLodop 重试节奏与通知策略。

## 测试与诊断资源
- `renderer/performance-test.html`：性能与内存压力测试。
- `test-enhanced-clodop.html`：验证 CLodop 连接、事件流与日志导出。
- `test-printtype.html`：模拟多打印机分菜流程，检查拆单结果。
- `renderer/print-maintenance-demo.html`：演示日常保养与手动排错步骤。
- `renderer/debug-test.html`：快速触发日志、打印、网络与性能诊断脚本。

## 运维建议
- 定期检查并升级 CLodop 服务版本，保持与打印机驱动兼容。
- 发布前执行性能与打印回归测试，重点验证 `renderer/performance-test.html` 与 `test-printtype.html`。
- 确认 GitHub Releases 至少存在一个正式版本，以确保自动更新正常工作。
- 定期清理日志与缓存；`MemoryMonitor` 可提供基础告警，可结合外部脚本扩展。
- 维护托盘菜单项与配置文件同步，避免重复启动、开机自启状态不一致等用户体验问题。

---
历史演进与维护记录请参阅 `docs/MAINTENANCE_LOG.md`。
