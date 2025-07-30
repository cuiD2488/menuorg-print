const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ReleaseManager {
  constructor() {
    this.packagePath = path.join(__dirname, '..', 'package.json');
    this.package = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
  }

  log(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      process: '🔄',
    };
    console.log(`${icons[type]} ${message}`);
  }

  exec(command, description) {
    this.log(`${description}...`, 'process');
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: ['inherit', 'pipe', 'inherit'],
      });
      this.log(`${description} 完成`, 'success');
      return result.trim();
    } catch (error) {
      this.log(`${description} 失败: ${error.message}`, 'error');
      throw error;
    }
  }

  checkEnvironment() {
    this.log('检查环境配置...', 'process');

    // 检查 Git 状态
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      if (status.trim()) {
        this.log('工作目录不干净，请先提交所有更改', 'warning');
        console.log('未提交的文件:');
        console.log(status);

        const answer = require('readline-sync').question('是否继续? (y/N): ');
        if (answer.toLowerCase() !== 'y') {
          process.exit(1);
        }
      }
    } catch (error) {
      this.log('无法检查 Git 状态，请确保在 Git 仓库中', 'error');
      throw error;
    }

    // 检查 GitHub Token
    if (!process.env.GH_TOKEN) {
      this.log('未找到 GH_TOKEN 环境变量', 'warning');
      this.log('请设置 GitHub Personal Access Token:', 'info');
      console.log('  Windows: set GH_TOKEN=your_token_here');
      console.log('  macOS/Linux: export GH_TOKEN="your_token_here"');

      const answer = require('readline-sync').question('是否已设置? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        process.exit(1);
      }
    }

    // 检查 package.json 配置
    if (!this.package.build || !this.package.build.publish) {
      this.log('package.json 中缺少发布配置', 'error');
      throw new Error('请配置 build.publish 字段');
    }

    this.log('环境检查通过', 'success');
  }

  updateVersion(type = 'patch') {
    this.log(`更新版本号 (${type})...`, 'process');

    const oldVersion = this.package.version;
    const newVersion = this.exec(`npm version ${type}`, '更新版本号');

    this.log(`版本号从 ${oldVersion} 更新到 ${newVersion}`, 'success');
    return newVersion;
  }

  buildApp() {
    this.log('构建应用...', 'process');

    // 清理旧的构建文件
    if (fs.existsSync('dist')) {
      this.exec('rmdir /s /q dist', '清理旧构建文件');
    }

    // 构建应用
    this.exec('npm run dist', '构建应用');

    // 检查构建结果
    if (!fs.existsSync('dist')) {
      throw new Error('构建失败，未找到 dist 目录');
    }

    const files = fs.readdirSync('dist');
    this.log(`构建完成，生成 ${files.length} 个文件`, 'success');

    files.forEach((file) => {
      const stats = fs.statSync(path.join('dist', file));
      this.log(
        `  - ${file} (${Math.round(stats.size / 1024 / 1024)}MB)`,
        'info'
      );
    });
  }

  publishRelease() {
    this.log('发布到 GitHub...', 'process');

    // 推送标签
    this.exec('git push --follow-tags', '推送标签');

    // 发布到 GitHub
    this.exec('npm run publish', '发布应用');

    this.log('发布完成', 'success');
  }

  generateReleaseNotes() {
    this.log('生成发布说明...', 'process');

    try {
      // 获取最新的提交记录
      const commits = execSync('git log --oneline -10', { encoding: 'utf8' });
      const version = this.package.version;

      const releaseNotes = `
# MenuorgPrint v${version}

## 更新内容

${commits
  .split('\n')
  .filter((line) => line.trim())
  .map((line) => `- ${line}`)
  .join('\n')}

## 安装说明

1. 下载对应平台的安装包
2. 运行安装程序
3. 如果已安装旧版本，程序会自动更新

## 问题反馈

如有问题请访问: https://github.com/${this.package.build.publish[0].owner}/${
        this.package.build.publish[0].repo
      }/issues
      `.trim();

      fs.writeFileSync('RELEASE_NOTES.md', releaseNotes);
      this.log('发布说明已生成: RELEASE_NOTES.md', 'success');
    } catch (error) {
      this.log('生成发布说明失败，但不影响发布', 'warning');
    }
  }

  async release(versionType = 'patch') {
    try {
      this.log('开始发布流程...', 'process');
      this.log(
        `应用名称: ${this.package.productName || this.package.name}`,
        'info'
      );
      this.log(`当前版本: ${this.package.version}`, 'info');

      // 环境检查
      this.checkEnvironment();

      // 更新版本号
      const newVersion = this.updateVersion(versionType);

      // 生成发布说明
      this.generateReleaseNotes();

      // 构建应用
      this.buildApp();

      // 发布
      this.publishRelease();

      this.log(`🚀 发布成功! 版本 ${newVersion}`, 'success');
      this.log(
        `GitHub Release: https://github.com/${this.package.build.publish[0].owner}/${this.package.build.publish[0].repo}/releases`,
        'info'
      );
    } catch (error) {
      this.log(`发布失败: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const versionType = args[0] || 'patch';

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.log('❌ 无效的版本类型');
  console.log('用法: node scripts/release.js [patch|minor|major]');
  console.log('  patch: 修复版本 (1.0.0 → 1.0.1)');
  console.log('  minor: 功能版本 (1.0.0 → 1.1.0)');
  console.log('  major: 主要版本 (1.0.0 → 2.0.0)');
  process.exit(1);
}

// 检查是否安装了 readline-sync
try {
  require('readline-sync');
} catch (error) {
  console.log('⚠️ 需要安装 readline-sync 依赖');
  console.log('运行: npm install --save-dev readline-sync');
  process.exit(1);
}

// 执行发布
const releaseManager = new ReleaseManager();
releaseManager.release(versionType);
