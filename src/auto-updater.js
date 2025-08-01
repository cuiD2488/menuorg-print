const { autoUpdater } = require('electron-updater');
const { dialog, Notification, BrowserWindow } = require('electron');
const path = require('path');

class AutoUpdaterManager {
  constructor() {
    this.mainWindow = null;
    this.isChecking = false;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.autoDownload = true; // 自动下载更新
    this.autoInstall = false; // 不自动安装，需要用户确认

    this.setupAutoUpdater();
    this.setupEventHandlers();
  }

  setupAutoUpdater() {
    console.log('🔄 [AutoUpdater] 开始初始化自动更新器...');

    // 配置自动更新器
    autoUpdater.autoDownload = this.autoDownload;
    autoUpdater.autoInstallOnAppQuit = this.autoInstall;

    console.log('🔄 [AutoUpdater] 配置信息:', {
      autoDownload: this.autoDownload,
      autoInstallOnAppQuit: this.autoInstall,
      updateURL: autoUpdater.getFeedURL(),
    });

    // 设置更新服务器（如果使用自定义服务器）
    // autoUpdater.setFeedURL({
    //   provider: 'generic',
    //   url: 'https://your-update-server.com/updates'
    // });

    console.log('✅ [AutoUpdater] 自动更新器初始化完成');
  }

  setupEventHandlers() {
    console.log('🔄 [AutoUpdater] 设置事件监听器...');

    // 检查更新时
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 [AutoUpdater] 检查更新事件触发');
      console.log('🔍 [AutoUpdater] 正在检查更新...');
      this.isChecking = true;
      this.showNotification('检查更新', '正在检查是否有新版本可用...');
    });

    // 有可用更新时
    autoUpdater.on('update-available', (info) => {
      console.log('✅ [AutoUpdater] 发现新版本事件触发');
      console.log('✅ [AutoUpdater] 发现新版本:', info.version);
      console.log('📦 [AutoUpdater] 更新信息:', info);
      this.isChecking = false;
      this.updateAvailable = true;

      this.showUpdateAvailableDialog(info);
    });

    // 没有可用更新时
    autoUpdater.on('update-not-available', (info) => {
      console.log('ℹ️ [AutoUpdater] 无更新事件触发');
      console.log('ℹ️ [AutoUpdater] 当前已是最新版本');
      console.log('📦 [AutoUpdater] 版本信息:', info);
      this.isChecking = false;
      this.updateAvailable = false;

      // 只有手动检查时才显示"已是最新版本"的通知
      if (this.manualCheck) {
        this.showNotification('检查更新', '当前已是最新版本');
        this.manualCheck = false;
      }
    });

    // 更新错误时
    autoUpdater.on('error', (err) => {
      console.error('❌ [AutoUpdater] 更新错误事件触发');
      console.error('❌ [AutoUpdater] 错误详情:', err);
      console.error('❌ [AutoUpdater] 错误消息:', err.message);
      console.error('❌ [AutoUpdater] 错误堆栈:', err.stack);
      console.error('❌ [AutoUpdater] 错误代码:', err.code);
      console.error('❌ [AutoUpdater] 错误类型:', typeof err);
      console.error(
        '❌ [AutoUpdater] 完整错误对象:',
        JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
      );

      this.isChecking = false;
      this.updateAvailable = false;

      // 分析错误类型并提供更具体的错误信息
      let errorMessage = '检查更新时发生错误，请稍后重试';

      console.log('🔍 [AutoUpdater] 开始分析错误类型...');

      if (err.message && err.message.includes('No published releases')) {
        errorMessage = '暂无发布版本，当前为最新版本';
        console.log('ℹ️ [AutoUpdater] 识别为：仓库中暂无发布版本');
      } else if (err.message && err.message.includes('ENOTFOUND')) {
        errorMessage = '网络连接失败，请检查网络连接';
        console.log('ℹ️ [AutoUpdater] 识别为：网络连接失败');
      } else if (err.message && err.message.includes('403')) {
        errorMessage = 'GitHub访问受限，请稍后重试';
        console.log('ℹ️ [AutoUpdater] 识别为：GitHub访问受限');
      } else if (err.message && err.message.includes('404')) {
        errorMessage = '仓库不存在或无权限访问';
        console.log('ℹ️ [AutoUpdater] 识别为：仓库不存在或无权限');
      } else {
        console.log('⚠️ [AutoUpdater] 未识别的错误类型');
      }

      console.log('📢 [AutoUpdater] 最终错误消息:', errorMessage);
      this.showNotification('更新检查', errorMessage);
    });

    // 更新下载进度
    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      console.log(
        `📥 下载进度: ${percent}% (${this.formatBytes(
          progressObj.transferred
        )}/${this.formatBytes(progressObj.total)})`
      );

      // 更新下载进度通知
      if (this.downloadProgressWindow) {
        this.downloadProgressWindow.webContents.send('download-progress', {
          percent,
          transferred: progressObj.transferred,
          total: progressObj.total,
          speed: progressObj.bytesPerSecond,
        });
      }
    });

    // 更新下载完成
    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ 更新下载完成:', info.version);
      this.updateDownloaded = true;

      this.showUpdateReadyDialog(info);
    });
  }

  // 设置主窗口引用
  setMainWindow(window) {
    this.mainWindow = window;
  }

  // 检查更新（启动时自动检查）
  async checkForUpdatesOnStartup() {
    try {
      console.log('🚀 启动时检查更新...');
      this.manualCheck = false;

      // 延迟几秒检查，让应用完全启动
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 5000);
    } catch (error) {
      console.error('❌ 启动时检查更新失败:', error);
    }
  }

  // 手动检查更新
  async checkForUpdatesManually() {
    try {
      console.log('🚀 [AutoUpdater] ========== 手动检查更新开始 ==========');
      console.log('🚀 [AutoUpdater] 检查当前状态...');

      if (this.isChecking) {
        console.log('⚠️ [AutoUpdater] 正在检查中，跳过重复请求');
        this.showNotification('检查更新', '正在检查更新中，请稍候...');
        return;
      }

      console.log('🔍 [AutoUpdater] 开始手动检查更新...');
      this.manualCheck = true;

      // 检查是否为开发模式
      const { app } = require('electron');
      const isPackaged = app.isPackaged;
      console.log('📦 [AutoUpdater] 应用打包状态:', isPackaged);

      if (!isPackaged) {
        console.log('🔧 [AutoUpdater] 开发模式：使用自定义检查方式...');
        this.isChecking = true;
        this.showNotification('检查更新', '正在检查是否有新版本...');

        // 模拟网络请求延迟
        setTimeout(async () => {
          try {
            console.log('🌐 [AutoUpdater] 开始检查GitHub Releases...');
            await this.checkGitHubReleases();
          } catch (error) {
            console.error('❌ [AutoUpdater] 检查GitHub Releases失败:', error);
            this.isChecking = false;
            this.showNotification(
              '更新检查',
              '检查更新时发生错误：' + error.message
            );
          }
        }, 2000);
        return;
      }

      console.log('📦 [AutoUpdater] 生产模式：使用electron-updater检查...');
      console.log(
        '🔄 [AutoUpdater] 调用 autoUpdater.checkForUpdatesAndNotify()...'
      );

      // 添加更多调试信息
      console.log('📋 [AutoUpdater] 当前配置:');
      console.log('   - Feed URL:', autoUpdater.getFeedURL());
      console.log('   - Auto Download:', autoUpdater.autoDownload);
      console.log(
        '   - Auto Install on Quit:',
        autoUpdater.autoInstallOnAppQuit
      );

      const result = await autoUpdater.checkForUpdatesAndNotify();
      console.log('✅ [AutoUpdater] checkForUpdatesAndNotify 完成:', result);
    } catch (error) {
      console.error('❌ [AutoUpdater] 手动检查更新异常:', error);
      console.error('❌ [AutoUpdater] 异常详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      this.showNotification('更新错误', '检查更新失败，请检查网络连接');
    }
  }

  // 开发模式下检查GitHub Releases
  async checkGitHubReleases() {
    const https = require('https');
    const { version } = require('../package.json');

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: '/repos/cuiD2488/menuorg-print/releases',
        method: 'GET',
        headers: {
          'User-Agent': 'MenuorgPrint-UpdateChecker',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          this.isChecking = false;

          try {
            const releases = JSON.parse(data);

            if (res.statusCode === 200) {
              if (Array.isArray(releases) && releases.length > 0) {
                const latestRelease = releases[0];
                const latestVersion = latestRelease.tag_name.replace(/^v/, '');

                console.log(`📦 最新发布版本: ${latestVersion}`);
                console.log(`📦 当前版本: ${version}`);

                if (this.compareVersions(latestVersion, version) > 0) {
                  this.showNotification(
                    '发现新版本',
                    `发现新版本 ${latestVersion}，当前版本 ${version}`
                  );
                } else {
                  this.showNotification('检查更新', '当前已是最新版本');
                }
                resolve();
              } else {
                console.log('📝 仓库中暂无发布版本');
                this.showNotification(
                  '检查更新',
                  '仓库中暂无发布版本，当前为开发版本'
                );
                resolve();
              }
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(new Error('解析响应失败: ' + error.message));
          }
        });
      });

      req.on('error', (error) => {
        this.isChecking = false;
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.abort();
        reject(new Error('请求超时'));
      });

      req.end();
    });
  }

  // 简单的版本比较
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map((n) => parseInt(n, 10));
    const parts2 = v2.split('.').map((n) => parseInt(n, 10));

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  // 显示有可用更新的对话框
  async showUpdateAvailableDialog(updateInfo) {
    try {
      const response = await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 ${updateInfo.version}`,
        detail: `当前版本: ${require('../package.json').version}\n新版本: ${
          updateInfo.version
        }\n\n更新内容:\n${
          updateInfo.releaseNotes || '修复问题和性能优化'
        }\n\n是否要下载并安装此更新？`,
        buttons: ['立即更新', '稍后提醒', '跳过此版本'],
        defaultId: 0,
        cancelId: 1,
        icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
      });

      switch (response.response) {
        case 0: // 立即更新
          this.downloadUpdate();
          break;
        case 1: // 稍后提醒
          console.log('👤 用户选择稍后提醒');
          this.scheduleReminder();
          break;
        case 2: // 跳过此版本
          console.log('👤 用户选择跳过此版本');
          this.skipVersion(updateInfo.version);
          break;
      }
    } catch (error) {
      console.error('❌ 显示更新对话框失败:', error);
    }
  }

  // 下载更新
  downloadUpdate() {
    try {
      console.log('📥 开始下载更新...');
      this.showDownloadProgress();
      autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('❌ 下载更新失败:', error);
      this.showNotification('下载失败', '更新下载失败，请稍后重试');
    }
  }

  // 显示下载进度窗口
  showDownloadProgress() {
    if (this.downloadProgressWindow) {
      this.downloadProgressWindow.focus();
      return;
    }

    this.downloadProgressWindow = new BrowserWindow({
      width: 400,
      height: 200,
      parent: this.mainWindow,
      modal: true,
      show: false,
      autoHideMenuBar: true,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '..', 'preload.js'),
      },
    });

    // 创建简单的下载进度HTML
    const progressHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>下载更新</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 160px;
        }
        .progress-container {
          width: 100%;
          max-width: 300px;
          text-align: center;
        }
        .progress-bar {
          width: 100%;
          height: 20px;
          background: #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #45a049);
          width: 0%;
          transition: width 0.3s ease;
        }
        .progress-text {
          font-size: 14px;
          color: #666;
          margin: 5px 0;
        }
        .speed-text {
          font-size: 12px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="progress-container">
        <h3>正在下载更新...</h3>
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">准备下载...</div>
        <div class="speed-text" id="speedText"></div>
      </div>
      <script>
        const { ipcRenderer } = require('electron');
        
        ipcRenderer.on('download-progress', (event, data) => {
          const progressFill = document.getElementById('progressFill');
          const progressText = document.getElementById('progressText');
          const speedText = document.getElementById('speedText');
          
          progressFill.style.width = data.percent + '%';
          progressText.textContent = \`\${data.percent}% (\${formatBytes(data.transferred)} / \${formatBytes(data.total)})\`;
          speedText.textContent = \`下载速度: \${formatBytes(data.speed)}/s\`;
        });
        
        function formatBytes(bytes) {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
      </script>
    </body>
    </html>
    `;

    this.downloadProgressWindow.loadURL(
      'data:text/html;charset=utf-8,' + encodeURIComponent(progressHtml)
    );
    this.downloadProgressWindow.once('ready-to-show', () => {
      this.downloadProgressWindow.show();
    });

    this.downloadProgressWindow.on('closed', () => {
      this.downloadProgressWindow = null;
    });
  }

  // 显示更新准备完成对话框
  async showUpdateReadyDialog(updateInfo) {
    try {
      // 关闭下载进度窗口
      if (this.downloadProgressWindow) {
        this.downloadProgressWindow.close();
        this.downloadProgressWindow = null;
      }

      const response = await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: '更新准备就绪',
        message: '新版本已下载完成',
        detail: `版本 ${updateInfo.version} 已下载完成并准备安装。\n\n应用程序将重启以完成更新过程。\n\n是否立即重启并安装更新？`,
        buttons: ['立即重启', '稍后重启'],
        defaultId: 0,
        cancelId: 1,
        icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
      });

      if (response.response === 0) {
        console.log('🔄 用户确认重启安装更新');
        this.quitAndInstall();
      } else {
        console.log('👤 用户选择稍后重启');
        this.showNotification('更新准备就绪', '更新将在下次启动时自动安装');
      }
    } catch (error) {
      console.error('❌ 显示更新准备对话框失败:', error);
    }
  }

  // 退出并安装更新
  quitAndInstall() {
    try {
      console.log('🔄 正在重启并安装更新...');
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      console.error('❌ 重启安装失败:', error);
      this.showNotification('安装失败', '更新安装失败，请手动重启应用');
    }
  }

  // 安排提醒
  scheduleReminder() {
    // 1小时后提醒
    setTimeout(() => {
      if (this.updateAvailable && !this.updateDownloaded) {
        this.showNotification('更新提醒', '有新版本可用，点击检查更新');
      }
    }, 60 * 60 * 1000); // 1小时
  }

  // 跳过版本
  skipVersion(version) {
    // 这里可以保存跳过的版本信息，避免再次提醒
    console.log(`👤 用户跳过版本: ${version}`);
  }

  // 显示通知
  showNotification(title, body, silent = true) {
    try {
      if (Notification.isSupported()) {
        new Notification({
          title: `MenuorgPrint - ${title}`,
          body,
          silent,
        }).show();
      }
    } catch (error) {
      console.error('❌ 显示通知失败:', error);
    }
  }

  // 格式化字节大小
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 获取更新状态
  getUpdateStatus() {
    return {
      isChecking: this.isChecking,
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      currentVersion: require('../package.json').version,
    };
  }
}

module.exports = AutoUpdaterManager;
