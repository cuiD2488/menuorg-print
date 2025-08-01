#!/usr/bin/env pwsh

Write-Host "GitHub Token Setup Tool" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

# Check if token is already set
$currentToken = $env:GH_TOKEN
if ($currentToken) {
    Write-Host "Current GH_TOKEN is set" -ForegroundColor Green
    Write-Host "Token length: $($currentToken.Length) characters" -ForegroundColor Gray
    Write-Host "Token prefix: $($currentToken.Substring(0, [Math]::Min(8, $currentToken.Length)))..." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "No GH_TOKEN set" -ForegroundColor Red
    Write-Host ""
}

Write-Host "How to get GitHub Personal Access Token:" -ForegroundColor Yellow
Write-Host "1. Visit: https://github.com/settings/tokens" -ForegroundColor White
Write-Host "2. Click 'Generate new token (classic)'" -ForegroundColor White
Write-Host "3. Select permissions: repo (full repository access)" -ForegroundColor White
Write-Host "4. Copy the generated token" -ForegroundColor White
Write-Host ""

# Prompt user for token
$newToken = Read-Host "Enter your GitHub Token (press Enter to skip)"

if ($newToken -and $newToken.Trim()) {
    $newToken = $newToken.Trim()

    # Validate token format
    if ($newToken.Length -lt 20) {
        Write-Host "Token too short, please check if complete" -ForegroundColor Red
        exit 1
    }

    if (-not $newToken.StartsWith("ghp_") -and -not $newToken.StartsWith("github_pat_")) {
        Write-Host "Token format may be incorrect, but will try to set" -ForegroundColor Yellow
    }

    # Set environment variable
    try {
        # Temporary set (current session)
        $env:GH_TOKEN = $newToken
        Write-Host "Temporary set successful (current PowerShell session)" -ForegroundColor Green

        # Permanent set (user level)
        [Environment]::SetEnvironmentVariable("GH_TOKEN", $newToken, "User")
        Write-Host "Permanent set successful (user environment variable)" -ForegroundColor Green

        Write-Host ""
        Write-Host "GitHub Token setup complete!" -ForegroundColor Green
        Write-Host "You can now run: npm run publish" -ForegroundColor White

    } catch {
        Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }

} else {
    Write-Host "Skipping token setup" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Testing current token:" -ForegroundColor Cyan

$testToken = $env:GH_TOKEN
if ($testToken) {
    try {
        Write-Host "Testing token validity..." -ForegroundColor Gray

        $headers = @{
            "Authorization" = "token $testToken"
            "User-Agent" = "MenuorgPrint-TokenTest"
        }

        $response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -TimeoutSec 10

        Write-Host "Token is valid!" -ForegroundColor Green
        Write-Host "User: $($response.login)" -ForegroundColor White
        Write-Host "Type: $($response.type)" -ForegroundColor White

        # Test repository access
        try {
            $repoResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/cuiD2488/menuorg-print" -Headers $headers -TimeoutSec 10
            Write-Host "Repository access is normal" -ForegroundColor Green
        } catch {
            Write-Host "Repository access failed: $($_.Exception.Message)" -ForegroundColor Red
        }

    } catch {
        Write-Host "Token invalid or network error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "No token set, cannot test" -ForegroundColor Red
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Ensure token is set correctly" -ForegroundColor White
Write-Host "2. Run 'npm run publish' to publish first version" -ForegroundColor White
Write-Host "3. Test auto-update functionality" -ForegroundColor White