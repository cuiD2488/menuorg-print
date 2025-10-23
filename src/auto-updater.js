const { autoUpdater } = require('electron-updater');
const { dialog, Notification, BrowserWindow } = require('electron');
const path = require('path');

class AutoUpdaterManager {
  constructor(options = {}) {
    const {
      compatibilityInfo = { supported: true, warnings: [] },
      isCoreBuild = false,
      buildVariant = 'full',
    } = options;

    this.mainWindow = null;
    this.compatibilityInfo = compatibilityInfo;
    this.buildVariant = buildVariant;
    this.isCoreBuild = isCoreBuild;

    this.manualCheck = false;
    this.isChecking = false;
    this.updateAvailable = false;
    this.updateDownloaded = false;
    this.availableVersion = null;
    this.lastUpdateInfo = null;
    this.lastCheckAt = null;
    this.lastDownloadAt = null;
    this.lastError = null;
    this.downloadProgress = null;
    this.downloadProgressWindow = null;

    this.autoDownload = true;
    this.autoInstall = false;

    this.disabledReason = null;
    if (process.env.MENUORG_DISABLE_AUTO_UPDATE === '1') {
      this.disabledReason = 'env-disabled';
    } else if (!this.compatibilityInfo.supported) {
      this.disabledReason = 'unsupported-os';
    } else if (this.isCoreBuild) {
      this.disabledReason = 'core-build';
    }

    this.autoUpdateDisabled = this.disabledReason !== null;

    this.setupAutoUpdater();
    this.setupEventHandlers();
  }

  setupAutoUpdater() {
    console.log('🔄 [AutoUpdater] 开始初始化自动更新器...', {
      disabled: this.autoUpdateDisabled,
      reason: this.disabledReason,
    });

    if (this.autoUpdateDisabled) {
      console.log('⚠️ [AutoUpdater] 自动更新已禁用，跳过初始化。');
      return;
    }

    autoUpdater.autoDownload = this.autoDownload;
    autoUpdater.autoInstallOnAppQuit = this.autoInstall;

    console.log('🔄 [AutoUpdater] 配置信息:', {
      autoDownload: this.autoDownload,
      autoInstallOnAppQuit: this.autoInstall,
      updateURL: autoUpdater.getFeedURL(),
    });

    console.log('✅ [AutoUpdater] 自动更新器初始化完成');
  }

  setupEventHandlers() {
    console.log('🔄 [AutoUpdater] 设置事件监听器...');

    if (this.autoUpdateDisabled) {
      console.log('⚠️ [AutoUpdater] 自动更新已禁用，不注册事件监听器。');
      return;
    }

    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 [AutoUpdater] 检查更新事件触发');
      console.log('🔍 [AutoUpdater] 正在检查更新...');
      this.isChecking = true;
      this.lastCheckAt = new Date().toISOString();
      this.lastError = null;
      this.availableVersion = null;
      this.lastUpdateInfo = null;
      this.downloadProgress = null;
      this.updateDownloaded = false;
      if (this.manualCheck) {
        this.showNotification('检查更新', '正在检查是否有新版本可用...');
      }
    });

    autoUpdater.on('update-available', (info) => {
      console.log('✅ [AutoUpdater] 发现新版本事件触发');
      console.log('✅ [AutoUpdater] 发现新版本:', info.version);
      console.log('📦 [AutoUpdater] 更新信息:', info);
      this.isChecking = false;
      this.updateAvailable = true;
      this.updateDownloaded = false;
      this.availableVersion = info.version;
      this.lastUpdateInfo = info;
      this.lastError = null;
      this.downloadProgress = null;
      this.manualCheck = false;

      this.showUpdateAvailableDialog(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('ℹ️ [AutoUpdater] 无更新事件触发');
      console.log('ℹ️ [AutoUpdater] 当前已是最新版本');
      console.log('📦 [AutoUpdater] 版本信息:', info);
      this.isChecking = false;
      this.updateAvailable = false;
      this.updateDownloaded = false;
      this.availableVersion = null;
      this.lastUpdateInfo = null;
      this.downloadProgress = null;
      this.lastError = null;

      if (this.manualCheck) {
        this.showNotification('检查更新', '当前已是最新版本');
        this.manualCheck = false;
      }
    });

    autoUpdater.on('error', (err) => {
      console.error('❌ [AutoUpdater] 更新错误事件触发');
      console.error('❌ [AutoUpdater] 错误详情:', err);

      this.isChecking = false;
      this.updateAvailable = false;
      this.updateDownloaded = false;
      this.manualCheck = false;
      this.downloadProgress = null;

      let errorMessage = '检查更新时发生错误，请稍后重试';
      const message = err && err.message ? err.message : '';

      if (message.includes('No published releases')) {
        errorMessage = '仓库暂无发布版本，当前为开发版本';
      } else if (message.includes('ENOTFOUND')) {
        errorMessage = '网络连接失败，请检查网络连接';
      } else if (message.includes('403')) {
        errorMessage = 'GitHub 访问受限，请稍后重试';
      } else if (message.includes('404')) {
        errorMessage = '仓库不存在或无权限访问';
      } else if (this.autoUpdateDisabled && this.disabledReason === 'unsupported-os') {
        errorMessage = '当前系统版本不支持自动更新，请使用 legacy 安装包手动升级。';
      } else if (this.autoUpdateDisabled && this.disabledReason === 'core-build') {
        errorMessage = '当前为核心精简版，不提供自动更新。';
      }

      this.lastError = {
        timestamp: new Date().toISOString(),
        message: errorMessage,
        raw: this.serializeError(err),
      };

      if (this.downloadProgressWindow) {
        this.downloadProgressWindow.close();
        this.downloadProgressWindow = null;
      }

      this.showNotification('更新检查', errorMessage);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      console.log(
        `📥 下载进度: ${percent}% (${this.formatBytes(
          progressObj.transferred
        )}/${this.formatBytes(progressObj.total)})`
      );

      this.downloadProgress = {
        percent,
        transferred: progressObj.transferred,
        total: progressObj.total,
        speed: progressObj.bytesPerSecond,
        timestamp: new Date().toISOString(),
      };

      if (this.downloadProgressWindow) {
        this.downloadProgressWindow.webContents.send('download-progress', {
          percent,
          transferred: progressObj.transferred,
          total: progressObj.total,
          speed: progressObj.bytesPerSecond,
        });
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ 更新下载完成:', info.version);
      this.isChecking = false;
      this.updateDownloaded = true;
      this.manualCheck = false;
      this.lastError = null;
      this.availableVersion = info.version || this.availableVersion;
      this.lastUpdateInfo = info;
      this.lastDownloadAt = new Date().toISOString();

      const totalSize = Array.isArray(info && info.files)
        ? info.files.reduce((maxSize, file) => {
            const size = Number(file.size) || 0;
            return size > maxSize ? size : maxSize;
          }, 0)
        : null;

      this.downloadProgress = {
        percent: 100,
        transferred: totalSize,
        total: totalSize,
        speed: null,
        timestamp: new Date().toISOString(),
      };

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

      if (this.autoUpdateDisabled) {
        console.log('⚠️ [AutoUpdater] 启动时跳过自动检查，原因:', this.disabledReason);
        if (this.disabledReason === 'unsupported-os') {
          this.showNotification('更新提示', '当前系统版本不支持自动更新，请使用 legacy 安装包手动升级。');
        } else if (this.disabledReason === 'core-build') {
          this.showNotification('更新提示', '当前为核心精简版，不提供自动更新。');
        }
        return { started: false, reason: this.disabledReason };
      }

      if (process.env.MENUORG_SKIP_STARTUP_UPDATE === '1') {
        console.log('ℹ️ [AutoUpdater] 通过环境变量跳过启动检查');
        return { started: false, reason: 'startup-skip' };
      }

      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 5000);

      return { started: true };
    } catch (error) {
      console.error('❌ 启动时检查更新失败:', error);
      return { started: false, error: error.message };
    }
  }

  // 手动检查更新
  async checkForUpdatesManually() {
    const result = {
      started: false,
      mode: 'autoUpdater',
      message: '',
      reason: null,
      compatibility: this.compatibilityInfo,
      autoUpdateDisabled: this.autoUpdateDisabled,
    };

    try {
      console.log('[AutoUpdater] ===== manual check started =====');
      console.log('[AutoUpdater] inspecting current state...');

      if (this.autoUpdateDisabled) {
        const message = this.getDisabledMessage();
        this.showNotification('更新检查', message);
        return { ...result, message, reason: this.disabledReason };
      }

      if (this.isChecking) {
        const message = '正在检查更新中，请稍候...';
        console.log('[AutoUpdater] already checking, skip duplicate request');
        this.showNotification('检查更新', message);
        return { ...result, message, reason: 'in-progress' };
      }

      console.log('[AutoUpdater] start manual check...');
      this.manualCheck = true;
      this.isChecking = true;
      this.lastCheckAt = new Date().toISOString();
      this.lastError = null;
      this.availableVersion = null;
      this.downloadProgress = null;

      const { app } = require('electron');
      const isPackaged = app.isPackaged;
      console.log('[AutoUpdater] packaged state:', isPackaged);

      if (!isPackaged) {
        console.log('[AutoUpdater] development mode: checking GitHub releases');
        this.showNotification('检查更新', '开发模式：通过 GitHub Releases 检查更新');

        setTimeout(async () => {
          try {
            console.log('[AutoUpdater] checking GitHub releases...');
            await this.checkGitHubReleases();
          } catch (error) {
            console.error('[AutoUpdater] GitHub releases check failed:', error);
            this.isChecking = false;
            this.lastError = {
              timestamp: new Date().toISOString(),
              message: error.message,
              raw: this.serializeError(error),
            };
            this.showNotification('更新检查', '检查更新时发生错误：' + error.message);
          }
        }, 2000);

        return {
          ...result,
          started: true,
          mode: 'development',
          message: '开发模式：使用 GitHub Releases 检查更新',
        };
      }

      console.log('[AutoUpdater] production mode: using electron-updater');
      console.log('[AutoUpdater] calling autoUpdater.checkForUpdatesAndNotify()');
      console.log('[AutoUpdater] current config:', {
        feedURL: autoUpdater.getFeedURL(),
        autoDownload: autoUpdater.autoDownload,
        autoInstallOnQuit: autoUpdater.autoInstallOnAppQuit,
      });

      this.showNotification('检查更新', '正在检查是否有新版本...');
      autoUpdater.checkForUpdatesAndNotify();

      return { ...result, started: true, message: '正在检查更新...' };
    } catch (error) {
      console.error('[AutoUpdater] manual check failed:', error);
      this.isChecking = false;
      this.manualCheck = false;
      this.lastError = {
        timestamp: new Date().toISOString(),
        message: error.message,
        raw: this.serializeError(error),
      };
      this.showNotification('更新检查', '检查更新时发生错误：' + error.message);
      return { ...result, reason: 'exception', error: error.message };
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
          this.manualCheck = false;
          this.lastCheckAt = new Date().toISOString();

          try {
            const releases = JSON.parse(data);

            this.lastError = null;
            this.downloadProgress = null;

            if (res.statusCode === 200) {
              if (Array.isArray(releases) && releases.length > 0) {
                const latestRelease = releases[0];
                const latestVersion = latestRelease.tag_name.replace(/^v/, '');

                console.log(`[AutoUpdater] latest release version: ${latestVersion}`);
                console.log(`[AutoUpdater] current version: ${version}`);

                if (this.compareVersions(latestVersion, version) > 0) {
                  this.updateAvailable = true;
                  this.availableVersion = latestVersion;
                  this.lastUpdateInfo = {
                    version: latestVersion,
                    releaseNotes: latestRelease.body,
                  };
                  this.showNotification(
                    '发现新版本',
                    `发现新版本 ${latestVersion}，当前版本 ${version}`
                  );
                } else {
                  this.updateAvailable = false;
                  this.availableVersion = null;
                  this.lastUpdateInfo = null;
                  this.showNotification('检查更新', '当前已是最新版本');
                }
                resolve();
              } else {
                console.log('[AutoUpdater] no releases found');
                this.updateAvailable = false;
                this.availableVersion = null;
                this.lastUpdateInfo = null;
                this.showNotification('检查更新', '仓库中暂无发布版本，当前为开发版本');
                resolve();
              }
            } else {
              const error = new Error(`HTTP ${res.statusCode}: ${data}`);
              this.lastError = {
                timestamp: new Date().toISOString(),
                message: error.message,
                raw: this.serializeError(error),
              };
              reject(error);
            }
          } catch (error) {
            this.lastError = {
              timestamp: new Date().toISOString(),
              message: error.message,
              raw: this.serializeError(error),
            };
            reject(new Error('解析响应失败: ' + error.message));
          }
        });
      });
      req.on('error', (error) => {
        this.isChecking = false;
        this.manualCheck = false;
        this.lastError = {
          timestamp: new Date().toISOString(),
          message: error.message,
          raw: this.serializeError(error),
        };
        reject(error);
      });

      req.setTimeout(10000, () => {
        req.abort();
        const timeoutError = new Error('请求超时');
        this.isChecking = false;
        this.manualCheck = false;
        this.lastError = {
          timestamp: new Date().toISOString(),
          message: timeoutError.message,
          raw: this.serializeError(timeoutError),
        };
        reject(timeoutError);
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
    if (this.autoUpdateDisabled) {
      const message = this.getDisabledMessage();
      this.showNotification('下载更新', message);
      return { success: false, message, reason: this.disabledReason };
    }

    try {
      console.log('[AutoUpdater] start downloading update...');
      this.downloadProgress = {
        percent: 0,
        transferred: 0,
        total: null,
        speed: null,
        timestamp: new Date().toISOString(),
      };
      this.showDownloadProgress();
      autoUpdater.downloadUpdate();
      return { success: true, message: '开始下载更新...', compatibility: this.compatibilityInfo };
    } catch (error) {
      console.error('[AutoUpdater] download update failed:', error);
      this.lastError = {
        timestamp: new Date().toISOString(),
        message: error.message,
        raw: this.serializeError(error),
      };
      this.showNotification('下载更新', '下载更新失败：' + error.message);
      return {
        success: false,
        message: '下载更新失败：' + error.message,
        reason: 'exception',
      };
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
      console.log('[AutoUpdater] restarting to install update...');
      autoUpdater.quitAndInstall(false, true);
      return { success: true, message: '应用即将重启以完成更新', compatibility: this.compatibilityInfo };
    } catch (error) {
      console.error('[AutoUpdater] quitAndInstall failed:', error);
      this.lastError = {
        timestamp: new Date().toISOString(),
        message: error.message,
        raw: this.serializeError(error),
      };
      this.showNotification('安装失败', '更新安装失败，请手动重启应用');
      return { success: false, message: '更新安装失败，请手动重启应用', reason: 'exception' };
    }
  }

  // 安排提醒
  scheduleReminder() {
    if (this.autoUpdateDisabled) {
      return;
    }
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
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  getDisabledMessage() {
    if (this.disabledReason === 'unsupported-os') {
      return '当前系统版本不支持自动更新，请使用 legacy 安装包手动升级。';
    }
    if (this.disabledReason === 'env-disabled') {
      return '自动更新已通过环境变量 MENUORG_DISABLE_AUTO_UPDATE 禁用。';
    }
    if (this.disabledReason === 'core-build') {
      return '当前为核心精简版，不提供自动更新。';
    }
    return '自动更新已禁用。';
  }

  serializeError(error) {
    if (!error) {
      return null;
    }
    const plain = {};
    Object.getOwnPropertyNames(error).forEach((key) => {
      plain[key] = error[key];
    });
    plain.name = error.name;
    plain.message = error.message;
    plain.stack = error.stack;
    return plain;
  }

  getCompatibilityInfo() {
    return this.compatibilityInfo;
  }

  // 获取更新状态
  getUpdateStatus() {
    return {
      isChecking: this.isChecking,
      updateAvailable: this.updateAvailable,
      updateDownloaded: this.updateDownloaded,
      currentVersion: require('../package.json').version,
      availableVersion: this.availableVersion,
      lastCheckAt: this.lastCheckAt,
      lastDownloadAt: this.lastDownloadAt,
      lastError: this.lastError,
      downloadProgress: this.downloadProgress,
      autoUpdateDisabled: this.autoUpdateDisabled,
      disabledReason: this.disabledReason,
      compatibility: this.compatibilityInfo,
      buildVariant: this.buildVariant,
    };
  }
}

module.exports = AutoUpdaterManager;
