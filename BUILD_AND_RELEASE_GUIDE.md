# 🚀 MenuorgPrint 构建和发布详细指南

## 环境准备

### 1. 必需的工具和环境

```bash
# Node.js (建议 16.x 或更高版本)
node --version  # 应该显示 v16.x.x 或更高

# npm (通常随 Node.js 安装)
npm --version   # 应该显示 8.x.x 或更高

# Git (用于版本控制和发布)
git --version   # 应该显示 2.x.x 或更高
```

### 2. 解决 npm 安装问题

如果遇到 npm 安装错误，按以下步骤解决：

```bash
# 方法一：更新 npm 到最新版本
npm install -g npm@latest

# 方法二：使用 yarn 替代 npm
npm install -g yarn
yarn install

# 方法三：删除 node_modules 重新安装
rmdir /s node_modules  # Windows
rm -rf node_modules    # macOS/Linux
npm install

# 方法四：重置 npm 配置
npm config list
npm config delete registry
npm config set registry https://registry.npmjs.org/
```

### 3. 安装项目依赖

```bash
# 安装生产依赖
npm install --save electron-updater@6.1.7

# 安装开发依赖（如果需要）
npm install --save-dev electron@22.3.27 electron-builder@26.0.12

# 验证安装
npm list electron-updater
```

## GitHub 仓库配置

### 1. 创建 GitHub 仓库

1. 登录 GitHub，创建新仓库
2. 仓库名称：`menuorg-print` (或您喜欢的名称)
3. 设置为 Public（自动更新需要公开访问）
4. 初始化 README.md

### 2. 配置本地 Git

```bash
# 初始化 Git 仓库（如果还没有）
git init

# 添加 GitHub 远程仓库
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 配置用户信息
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 首次提交
git add .
git commit -m "Initial commit with auto-update feature"
git push -u origin main
```

### 3. 生成 GitHub Token

1. 访问 GitHub → Settings → Developer settings → Personal access tokens
2. 点击 "Generate new token (classic)"
3. 选择权限：
   - ✅ `repo` (Full control of private repositories)
   - ✅ `write:packages` (Upload packages to GitHub Package Registry)
4. 复制生成的 token（只显示一次）

### 4. 配置环境变量

```bash
# Windows (PowerShell)
$env:GH_TOKEN = "your_github_token_here"

# Windows (CMD)
set GH_TOKEN=your_github_token_here

# macOS/Linux (Bash)
export GH_TOKEN="your_github_token_here"

# 永久设置（添加到环境变量）
# Windows: 系统属性 → 高级 → 环境变量
# macOS/Linux: 添加到 ~/.bashrc 或 ~/.zshrc
```

## 项目配置更新

### 1. 更新 package.json

```json
{
  "name": "menuorg-print",
  "version": "1.0.0",
  "description": "Menuorg Order Print with Auto-Update",
  "main": "main.js",
  "homepage": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
  },
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "dist": "electron-builder --publish=never",
    "publish": "electron-builder --publish=always",
    "release": "npm version patch && npm run publish"
  },
  "build": {
    "appId": "com.menuorg.orderprinter",
    "productName": "MenuorgPrint",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "renderer/**/*",
      "src/**/*",
      "assets/**/*",
      "node_modules/**/*"
    ],
    "publish": [
      {
        "provider": "github",
        "owner": "YOUR_USERNAME",
        "repo": "YOUR_REPO_NAME",
        "releaseType": "release"
      }
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.ico",
      "requestedExecutionLevel": "asInvoker",
      "artifactName": "${productName}-Setup-${version}.${ext}"
    },
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "assets/icon.icns",
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.png",
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    "nsis": {
      "oneClick": false,
      "perMachine": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "MenuorgPrint",
      "installerIcon": "assets/icon.ico",
      "uninstallerIcon": "assets/icon.ico",
      "allowElevation": true,
      "runAfterFinish": true,
      "menuCategory": "Business Tools"
    }
  },
  "dependencies": {
    "electron-updater": "^6.1.7"
  },
  "devDependencies": {
    "electron": "^22.3.27",
    "electron-builder": "^26.0.12"
  }
}
```

### 2. 创建发布配置文件

创建 `electron-builder-config.js`：

```javascript
module.exports = {
  appId: 'com.menuorg.orderprinter',
  productName: 'MenuorgPrint',
  directories: {
    output: 'dist'
  },
  publish: {
    provider: 'github',
    owner: 'YOUR_USERNAME',
    repo: 'YOUR_REPO_NAME'
  },
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico'
  },
  mac: {
    target: 'dmg',
    icon: 'assets/icon.icns'
  },
  linux: {
    target: 'AppImage',
    icon: 'assets/icon.png'
  }
};
```

## 构建流程

### 1. 版本管理

```bash
# 查看当前版本
npm version

# 更新版本号
npm version patch    # 1.0.0 → 1.0.1 (修复)
npm version minor    # 1.0.0 → 1.1.0 (新功能)
npm version major    # 1.0.0 → 2.0.0 (重大更改)

# 手动指定版本
npm version 1.2.3
```

### 2. 本地构建测试

```bash
# 构建但不发布（用于测试）
npm run dist

# 检查生成的文件
ls dist/  # 查看构建输出

# 测试安装包
# Windows: 运行 dist/*.exe
# macOS: 打开 dist/*.dmg
# Linux: 运行 dist/*.AppImage
```

### 3. 发布前检查清单

- [ ] 代码已提交到 Git
- [ ] 版本号已更新
- [ ] GitHub Token 已配置
- [ ] package.json 中的仓库信息正确
- [ ] 本地构建测试通过
- [ ] 所有功能测试完成

## 发布流程

### 1. 自动发布（推荐）

```bash
# 一键发布：更新版本号并发布
npm run release

# 或者分步操作
npm version patch        # 更新版本号
git push --tags         # 推送标签到 GitHub
npm run publish         # 构建并发布
```

### 2. 手动发布流程

```bash
# 步骤 1: 提交所有更改
git add .
git commit -m "Release version 1.0.1"

# 步骤 2: 创建版本标签
git tag v1.0.1
git push origin main
git push origin v1.0.1

# 步骤 3: 构建并发布
npm run publish
```

### 3. 发布后验证

1. **检查 GitHub Release**
   - 访问 `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/releases`
   - 确认新版本已创建
   - 下载并测试安装包

2. **检查 latest.yml**
   - 确认 `latest.yml` 文件已生成
   - 包含正确的版本信息和下载链接

3. **测试自动更新**
   - 运行旧版本应用
   - 确认能检测到新版本
   - 测试下载和安装流程

## 持续集成 (CI/CD)

### 1. GitHub Actions 配置

创建 `.github/workflows/release.yml`：

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run publish
```

### 2. 自动化发布脚本

创建 `scripts/release.js`：

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

function release() {
  try {
    // 检查工作目录是否干净
    execSync('git diff-index --quiet HEAD --', { stdio: 'inherit' });
    
    // 更新版本号
    const version = execSync('npm version patch', { encoding: 'utf8' }).trim();
    console.log(`📦 New version: ${version}`);
    
    // 推送到 GitHub
    execSync('git push --follow-tags', { stdio: 'inherit' });
    
    // 构建并发布
    execSync('npm run publish', { stdio: 'inherit' });
    
    console.log('🚀 Release completed successfully!');
  } catch (error) {
    console.error('❌ Release failed:', error.message);
    process.exit(1);
  }
}

release();
```

## 问题排查

### 1. 常见错误及解决方案

**错误：Cannot read properties of null (reading 'matches')**
```bash
# 解决方案：更新 npm 和清理缓存
npm install -g npm@latest
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**错误：GitHub API rate limit exceeded**
```bash
# 解决方案：使用个人访问令牌
export GH_TOKEN="your_github_token"
```

**错误：ENOSPC: no space left on device**
```bash
# 解决方案：清理磁盘空间
npm cache clean --force
rm -rf dist/ node_modules/
```

### 2. 调试技巧

```bash
# 启用详细日志
DEBUG=electron-builder npm run publish

# 检查构建配置
npx electron-builder --help

# 验证更新服务器
curl -I https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/releases/latest
```

## 最佳实践

1. **版本号管理**
   - 使用语义化版本控制 (SemVer)
   - 修复 bug → patch (1.0.1)
   - 新功能 → minor (1.1.0)
   - 重大更改 → major (2.0.0)

2. **发布频率**
   - 重要修复：立即发布
   - 新功能：每周或双周发布
   - 大版本：每月或季度发布

3. **测试策略**
   - 在多个操作系统上测试
   - 测试从旧版本更新到新版本
   - 验证回滚机制

4. **用户通知**
   - 在 Release Notes 中详细说明更改
   - 提供降级指南（如需要）
   - 监控用户反馈和错误报告

---

*最后更新：2024年12月* 