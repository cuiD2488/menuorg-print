@echo off
chcp 65001 >nul
echo.
echo 🚀 MenuorgPrint 快速发布工具
echo ================================
echo.

REM 检查是否在正确的目录
if not exist "package.json" (
    echo ❌ 错误：请在项目根目录运行此脚本
    pause
    exit /b 1
)

REM 检查Node.js和npm
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 npm
    pause
    exit /b 1
)

echo ✅ Node.js 和 npm 检查通过

REM 检查Git状态
git status --porcelain >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：当前目录不是Git仓库
    pause
    exit /b 1
)

echo ✅ Git 仓库检查通过

REM 检查是否有未提交的更改
for /f %%i in ('git status --porcelain') do (
    echo ⚠️ 警告：有未提交的更改
    echo 未提交的文件：
    git status --short
    echo.
    set /p choice="是否继续？(y/N): "
    if /i not "!choice!"=="y" (
        echo 取消发布
        pause
        exit /b 1
    )
    goto :continue
)
echo ✅ 工作目录干净

:continue

REM 检查GitHub Token
if "%GH_TOKEN%"=="" (
    echo ⚠️ 警告：未设置 GH_TOKEN 环境变量
    echo 请设置 GitHub Personal Access Token：
    echo   set GH_TOKEN=your_token_here
    echo.
    set /p choice="是否已设置？(y/N): "
    if /i not "!choice!"=="y" (
        echo 请先设置 GH_TOKEN 环境变量
        pause
        exit /b 1
    )
)

echo ✅ 环境检查完成
echo.

REM 选择版本类型
echo 请选择版本更新类型：
echo 1. patch - 修复版本 (1.0.0 → 1.0.1)
echo 2. minor - 功能版本 (1.0.0 → 1.1.0)  
echo 3. major - 主要版本 (1.0.0 → 2.0.0)
echo.
set /p version_choice="请输入选择 (1-3, 默认1): "

if "%version_choice%"=="" set version_choice=1
if "%version_choice%"=="1" set version_type=patch
if "%version_choice%"=="2" set version_type=minor
if "%version_choice%"=="3" set version_type=major

if not defined version_type (
    echo ❌ 无效选择
    pause
    exit /b 1
)

echo.
echo 🔄 开始发布流程...
echo 版本类型: %version_type%
echo.

REM 安装依赖（如果需要）
if not exist "node_modules" (
    echo 📦 安装依赖...
    npm install
    if errorlevel 1 (
        echo ❌ 安装依赖失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
)

REM 获取当前版本
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set current_version=%%a
    set current_version=!current_version:"=!
    goto :version_found
)
:version_found

echo 当前版本: %current_version%

REM 更新版本号
echo 🏷️ 更新版本号...
npm version %version_type%
if errorlevel 1 (
    echo ❌ 版本更新失败
    pause
    exit /b 1
)

REM 获取新版本号
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set new_version=%%a
    set new_version=!new_version:"=!
    goto :new_version_found
)
:new_version_found

echo ✅ 版本更新完成: %current_version% → %new_version%

REM 构建应用
echo 🔨 构建应用...
if exist "dist" rmdir /s /q dist
npm run build
if errorlevel 1 (
    echo ❌ 构建失败
    pause
    exit /b 1
)
echo ✅ 构建完成

REM 推送到GitHub
echo 📤 推送到 GitHub...
git push --follow-tags
if errorlevel 1 (
    echo ❌ 推送失败
    pause
    exit /b 1
)
echo ✅ 推送完成

REM 发布到GitHub Release
echo 🚀 发布到 GitHub Release...
npm run publish
if errorlevel 1 (
    echo ❌ 发布失败
    pause
    exit /b 1
)

echo.
echo 🎉 发布成功！
echo ✅ 新版本: %new_version%
echo 📦 安装包已生成到 dist/ 目录
echo 🌐 GitHub Release 已创建
echo.
echo 📋 发布后检查清单：
echo   □ 检查 GitHub Release 页面
echo   □ 下载并测试安装包  
echo   □ 测试自动更新功能
echo   □ 更新发布说明（如需要）
echo.
echo 感谢使用 MenuorgPrint 发布工具！
echo.
pause 