# Release & Update 指南

面向多架构的发行与自动更新流程，按以下步骤执行：

## 1. 环境准备
- Node.js 16+、npm 8+。
- 设置 GitHub Token：运行 `powershell -ExecutionPolicy Bypass -File set-github-token.ps1` 或手动将带 `repo` 权限的 `GH_TOKEN` 写入环境变量。
- 清理旧构建：`rimraf dist`（或手动删除 `dist/`、`dist/legacy/`）。
- 确保 `package.json` 版本号已更新（`npm version <patch|minor|major>`）。

## 2. 构建脚本矩阵
```bash
npm run build:win:x64   # Windows 10/11 64 位安装包
npm run build:win:ia32  # Windows 10 32 位安装包
npm run build:win:arm64 # Windows 11 on ARM 安装包
npm run build:win:all   # 一次性输出 x64/ia32/arm64 安装包
npm run build:win10     # Win10+ 通用 Web 安装器（NSIS Web）
npm run build:legacy    # Windows 7/8 兼容包（Electron 19，输出 dist/legacy/）
npm run build:core      # Core 核心精简包（输出 dist/core，需要手动分发）
npm run publish         # 根据 builder 配置构建并上传 GitHub Releases
```
> 推荐使用 `npm run publish` 生成并上传所有 Win10+ 安装包；随后再运行 `npm run build:legacy`，将 `dist/legacy/MenuorgPrint-win7-ia32-<version>.exe` 手动附加到同一个 Release。

## 3. GitHub Releases 资产清单
执行 `npm run publish` 后，Release 中应至少包含：
- `MenuorgPrint-win32-x64-<version>.exe`
- `MenuorgPrint-win32-ia32-<version>.exe`
- `MenuorgPrint-win32-arm64-<version>.exe`
- `MenuorgPrint-WebSetup-<version>-x64.exe`
- `MenuorgPrint-WebSetup-<version>-arm64.exe`
- `latest.yml`、`latest-ia32.yml`、`latest-arm64.yml`
- 对应的 `*.blockmap` 文件（供差分更新使用）
- （如需）`MenuorgPrint-win7-ia32-<version>.exe`（legacy 包，需手动上传）
- （可选）`MenuorgPrint-Core-<arch>-<version>.exe`（核心精简包，需手动上传 dist/core/ 下的产物）

> 若缺少 `latest*.yml`，自动更新将无法正常工作。请确认 Release 发布为 “Published” 状态而非 Draft。

## 4. 自动更新验证
1. 在打包后的最新版本上打开“设置 → 应用更新”，确认兼容性提示与推荐脚本正常显示。
2. 点击“检查更新”后，观察 `electron.log`（或控制台）中的 `autoUpdater` 日志；当发现新版本时应弹出对话框或在 UI 中显示“有新版本可用”。
3. 测试 `下载更新` 和 `安装更新` 按钮可正常调用 electron-updater；下载过程中可在 UI 看到进度条或独立的进度窗口。
4. 在 Windows 7/8 设备上运行 legacy 安装包，确认应用不会尝试自动更新，并提示使用离线包升级。

## 5. 常见问题
- **提示 “No published releases”**：Release 还未发布或未上传任何构建，请先运行 `npm run publish` 并确保 Release 处于 Published 状态。
- **提示 “autoUpdater 未初始化”**：当前运行的是开发模式或缺少打包产物。请使用 `npm run build`/`npm run publish` 后再测试。
- **提示 “系统不支持自动更新”**：应用检测到 Windows 10 以下版本，会禁用自动更新并引导使用 legacy 安装包，属于预期行为。
- **下载失败 / 校验失败**：确认 `latest*.yml` 与对应的 exe/blockmap 文件在 Release 中配对存在，且网络可访问 `github.com`。

## 6. 调试技巧
- 设置 `MENUORG_DISABLE_AUTO_UPDATE=1` 可在测试环境禁用自动更新逻辑，仅保留下载按钮。
- 设置 `MENUORG_DISABLE_GPU=1` 可启用低资源模式，模拟旧硬件环境。
- 开发模式下可通过 `checkForUpdates()` 调用 GitHub API，日志输出位于控制台。
- `src/auto-updater.js` 会记录最后一次错误信息，可在渲染界面“设置 → 应用更新”中查看。

## 7. 发布完成后的收尾
- 清理 `dist/` 与 `dist/legacy/` 以免下次发布携带旧产物。
- 在 `docs/MAINTENANCE_LOG.md` 中登记版本号、发布日期与主要变更。
- 若需要灰度发布，可暂缓执行 `npm run publish`，改用 `npm run build:win:all` 生成本地安装包后手动分发。
