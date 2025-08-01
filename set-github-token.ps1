#!/usr/bin/env pwsh

Write-Host "🔑 GitHub Token 设置工具" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Cyan

# 检查是否已设置Token
$currentToken = $env:GH_TOKEN
if ($currentToken) {
    Write-Host "✅ 当前已设置 GH_TOKEN" -ForegroundColor Green
    Write-Host "   Token 长度: $($currentToken.Length) 字符" -ForegroundColor Gray
    Write-Host "   Token 前缀: $($currentToken.Substring(0, [Math]::Min(8, $currentToken.Length)))..." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ 未设置 GH_TOKEN" -ForegroundColor Red
    Write-Host ""
}

Write-Host "📋 如何获取 GitHub Personal Access Token:" -ForegroundColor Yellow
Write-Host "1. 访问: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "2. 点击 'Generate new token (classic)'" -ForegroundColor White
Write-Host "3. 选择权限: repo (完整仓库权限)" -ForegroundColor White
Write-Host "4. 复制生成的 Token" -ForegroundColor White
Write-Host ""

# 提示用户输入Token
$newToken = Read-Host "请输入您的 GitHub Token (回车跳过)"

if ($newToken -and $newToken.Trim()) {
    $newToken = $newToken.Trim()
    
    # 验证Token格式
    if ($newToken.Length -lt 20) {
        Write-Host "❌ Token 长度太短，请检查是否完整" -ForegroundColor Red
        exit 1
    }
    
    if (-not $newToken.StartsWith("ghp_") -and -not $newToken.StartsWith("github_pat_")) {
        Write-Host "⚠️  Token 格式可能不正确，但仍会尝试设置" -ForegroundColor Yellow
    }
    
    # 设置环境变量
    try {
        # 临时设置（当前会话）
        $env:GH_TOKEN = $newToken
        Write-Host "✅ 临时设置成功 (当前PowerShell会话)" -ForegroundColor Green
        
        # 永久设置（用户级别）
        [Environment]::SetEnvironmentVariable("GH_TOKEN", $newToken, "User")
        Write-Host "✅ 永久设置成功 (用户环境变量)" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🎉 GitHub Token 设置完成！" -ForegroundColor Green
        Write-Host "   您现在可以运行: npm run publish" -ForegroundColor White
        
    } catch {
        Write-Host "❌ 设置失败: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    
} else {
    Write-Host "⏭️  跳过 Token 设置" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 测试当前 Token:" -ForegroundColor Cyan

$testToken = $env:GH_TOKEN
if ($testToken) {
    try {
        Write-Host "正在测试 Token 有效性..." -ForegroundColor Gray
        
        $headers = @{
            "Authorization" = "token $testToken"
            "User-Agent" = "MenuorgPrint-TokenTest"
        }
        
        $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -TimeoutSec 10
        
        Write-Host "✅ Token 有效！" -ForegroundColor Green
        Write-Host "   用户: $($response.login)" -ForegroundColor White
        Write-Host "   类型: $($response.type)" -ForegroundColor White
        
        # 测试仓库权限
        try {
            $repoResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/cuiD2488/menuorg-print" -Headers $headers -TimeoutSec 10
            Write-Host "✅ 仓库访问权限正常" -ForegroundColor Green
        } catch {
            Write-Host "❌ 仓库访问失败: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "❌ Token 无效或网络错误: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ 未设置 Token，无法测试" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 下一步操作:" -ForegroundColor Cyan
Write-Host "1. 确保 Token 设置正确" -ForegroundColor White
Write-Host "2. 运行 'npm run publish' 发布第一个版本" -ForegroundColor White
Write-Host "3. 测试自动更新功能" -ForegroundColor White 