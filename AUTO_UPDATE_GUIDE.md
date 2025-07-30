# 🔄 MenuorgPrint 自动更新功能使用指南

## 功能概述
myToken
# cmd 临时设置
set GH_TOKEN=myToken
# owerShell 窗口设置
$env:GH_TOKEN = "myToken"
# 设置用户级别的环境变量（推荐）
[Environment]::SetEnvironmentVariable("GH_TOKEN", "myToken", "User")
# 使用 curl 测试 Token（替换为您的实际 Token）
curl -H "Authorization: token myToken" https://api.github.com/repos/cuidi/menuorg-print
# Windows CMD
echo %GH_TOKEN%
# 使用 curl 测试 Token（可选）
curl -H "Authorization: token myToken" https://api.github.com/user
# 发布
npm run publish
MenuorgPrint 现已集成自动更新功能，支持：
- ✅ 启动时自动检查更新
- ✅ 手动检查更新
- ✅ 自动下载新版本
- ✅ 用户确认后安装更新
- ✅ 版本管理和通知

## 使用方法

### 1. 自动更新检查

应用启动后会自动在后台检查更新（仅生产环境）：
- 🔍 延迟5秒后开始检查
- 📢 有新版本时会弹出通知对话框
- ⏰ 支持"立即更新"、"稍后提醒"、"跳过版本"选项

### 2. 手动检查更新

两种方式手动检查更新：

#### 方法一：通过托盘菜单
1. 右键点击系统托盘中的 MenuorgPrint 图标
2. 选择 "🔄 检查更新"
3. 等待检查结果

#### 方法二：通过应用界面
1. 打开应用主界面
2. 在设置面板中找到"🔄 应用更新"区域
3. 点击"检查更新"按钮

### 3. 下载和安装更新

当发现新版本时：

1. **发现更新**
   - 显示新版本信息和更新内容
   - 选择"立即更新"开始下载

2. **下载过程**
   - 显示下载进度窗口
   - 实时显示下载速度和完成百分比
   - 可以在后台继续使用应用

3. **安装更新**
   - 下载完成后提示"更新准备就绪"
   - 选择"立即重启"开始安装
   - 应用会自动重启并应用新版本

## 版本发布流程

### 开发者发布新版本

1. **更新版本号**
   ```bash
   # 修改 package.json 中的版本号
   "version": "1.0.1"
   ```

2. **构建和发布**
   ```bash
   # 安装依赖
   npm install

   # 构建并发布到 GitHub
   npm run publish
   ```

3. **GitHub Release**
   - 自动创建 GitHub Release
   - 上传安装包和更新文件
   - 客户端会自动检测到新版本

### 配置发布源

在 `package.json` 中配置发布设置：

```json
{
  "build": {
    "publish": [
      {
        "provider": "github",
        "owner": "your-github-username",
        "repo": "your-repo-name"
      }
    ]
  }
}
```

## 文件结构

```
├── src/
│   └── auto-updater.js          # 自动更新管理器
├── renderer/
│   └── js/
│       └── update-manager.js    # 前端更新界面
├── main.js                      # 集成更新功能
├── preload.js                   # 添加更新API
└── package.json                 # 更新配置
```

## 注意事项

### 开发环境
- 🔧 开发模式下自动更新功能被禁用
- 📝 控制台会显示"开发模式，跳过自动更新检查"
- 🧪 可以通过修改代码测试更新界面

### 生产环境
- ✅ 只有打包后的应用才会启用自动更新
- 🔐 需要配置正确的 GitHub 仓库信息
- 📦 确保有足够的存储空间下载更新

### 网络要求
- 🌐 需要互联网连接检查和下载更新
- 🚀 支持断点续传（如果服务器支持）
- ⏱️ 网络超时会自动重试

## 故障排除

### 常见问题

1. **检查更新失败**
   - 检查网络连接
   - 确认 GitHub 仓库配置正确
   - 查看控制台错误信息

2. **下载失败**
   - 检查磁盘空间
   - 确认防火墙设置
   - 重新尝试下载

3. **安装失败**
   - 确保应用有足够权限
   - 关闭杀毒软件临时保护
   - 手动下载安装包安装

### 日志信息

在控制台查看更新相关日志：
```
🔄 自动更新器已初始化
🚀 启动时检查更新...
🔍 正在检查更新...
✅ 发现新版本: 1.0.1
📥 下载进度: 50% (2.5MB/5.0MB)
✅ 更新下载完成: 1.0.1
🔄 正在重启并安装更新...
```

## 更新配置

### 自定义更新服务器

如果不使用 GitHub，可以配置自定义更新服务器：

```javascript
// 在 auto-updater.js 中
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-update-server.com/updates'
});
```

### 更新频率设置

可以修改检查更新的频率：

```javascript
// 修改检查间隔（默认30秒）
setInterval(() => {
  this.refreshUpdateStatus();
}, 60000); // 改为60秒
```

## 安全考虑

- 🔒 更新包会进行数字签名验证
- 🛡️ 只从配置的可信源下载更新
- 🔐 支持 HTTPS 加密传输
- ⚠️ 建议定期备份重要配置

## 技术支持

如有问题请联系技术支持或查看项目 GitHub 仓库的 Issues 页面。

---

*最后更新：2024年12月*