/**
 * 前端更新管理器
 * 负责处理自动更新相关的UI交互
 */
class UpdateManager {
  constructor() {
    this.compatibilityInfo = null;
    this.buildInfo = null;
    this.coreMode = false;
    this.updateStatus = {
      isChecking: false,
      updateAvailable: false,
      updateDownloaded: false,
      currentVersion: '1.0.0',
      availableVersion: null,
      downloadProgress: null,
      lastCheckAt: null,
      lastDownloadAt: null,
      lastError: null,
      autoUpdateDisabled: false,
      disabledReason: null,
      compatibility: null,
    };

    this.init();
  }

  async init() {
    console.log('🔄 初始化更新管理器...');

    try {
      await this.refreshUpdateStatus();
      await this.loadCompatibilityInfo();
      await this.loadBuildInfo();

      if (this.coreMode) {
        this.updateStatus.autoUpdateDisabled = true;
        this.updateStatus.disabledReason = this.updateStatus.disabledReason || 'core-build';
      }

      this.createUpdateUI();
      this.updateCompatibilityUI();

      if (!this.coreMode) {
        setInterval(() => {
          this.refreshUpdateStatus();
        }, 30000);
      }

      console.log('✅ 更新管理器初始化完成');
    } catch (error) {
      console.error('❌ 初始化更新管理器失败:', error);
    }
  }

  async refreshUpdateStatus() {
    try {
      const result = await window.electronAPI.getUpdateStatus();
      if (result && result.success) {
        this.updateStatus = {
          ...this.updateStatus,
          isChecking: result.isChecking,
          updateAvailable: result.updateAvailable,
          updateDownloaded: result.updateDownloaded,
          currentVersion: result.currentVersion,
          availableVersion: result.availableVersion ?? this.updateStatus.availableVersion,
          downloadProgress: result.downloadProgress ?? null,
          lastCheckAt: result.lastCheckAt ?? this.updateStatus.lastCheckAt,
          lastDownloadAt: result.lastDownloadAt ?? this.updateStatus.lastDownloadAt,
          lastError: result.lastError ?? null,
          autoUpdateDisabled: result.autoUpdateDisabled ?? this.updateStatus.autoUpdateDisabled,
          disabledReason: result.disabledReason ?? this.updateStatus.disabledReason,
          compatibility: result.compatibility ?? this.updateStatus.compatibility,
        };

        if (result.compatibility) {
          this.compatibilityInfo = result.compatibility;
        }

        if (this.buildInfo && this.coreMode) {
          this.updateStatus.autoUpdateDisabled = true;
          this.updateStatus.disabledReason = this.updateStatus.disabledReason || 'core-build';
        }

        this.updateUI();
      }
    } catch (error) {
      console.error('❌ 获取更新状态失败:', error);
    }
  }
  async loadBuildInfo() {
    if (window.menuorgBuildInfo) {
      this.buildInfo = window.menuorgBuildInfo;
      this.coreMode = this.buildInfo?.variant === 'core' || this.buildInfo?.isCoreBuild === true;
      return;
    }

    if (!window.electronAPI || !window.electronAPI.getBuildInfo) {
      return;
    }

    try {
      const info = await window.electronAPI.getBuildInfo();
      if (info) {
        this.buildInfo = info;
        window.menuorgBuildInfo = info;
        this.coreMode = info.variant === 'core' || info.isCoreBuild === true;
        if (this.coreMode) {
          document.body.classList.add('core-mode');
        }
        if (info.compatibility) {
          this.compatibilityInfo = info.compatibility;
          this.updateStatus.compatibility = info.compatibility;
        }
      }
    } catch (error) {
      console.warn('⚠️ 获取构建信息失败:', error);
    }
  }


  async loadCompatibilityInfo() {
    if (!window.electronAPI || !window.electronAPI.getCompatibilityInfo) {
      return;
    }

    try {
      const info = await window.electronAPI.getCompatibilityInfo();
      if (info) {
        this.compatibilityInfo = info;
        this.updateStatus.compatibility = info;
        if (info.supported === false) {
          this.updateStatus.autoUpdateDisabled = true;
          this.updateStatus.disabledReason = this.updateStatus.disabledReason || 'unsupported-os';
        }
      }
    } catch (error) {
      console.warn('⚠️ 获取兼容性信息失败:', error);
    }
  }

  createUpdateUI() {
    const settingsContainer = document.querySelector('.config-panel');
    if (!settingsContainer) {
      console.warn('⚠️ 未找到设置容器，跳过创建更新UI');
      return;
    }

    const updateSection = document.createElement('div');
    updateSection.className = 'update-section';
    updateSection.innerHTML = `
      <div class="setting-group update-settings core-hidden">
        <h3>🔄 应用更新</h3>
        <div class="update-info">
          <div class="update-item">
            <label>当前版本:</label>
            <span id="currentVersion">${this.updateStatus.currentVersion}</span>
          </div>
          <div class="update-item">
            <label>可用版本:</label>
            <span id="availableVersion">-</span>
          </div>
          <div class="update-item">
            <label>更新状态:</label>
            <span id="updateStatus">检查中...</span>
          </div>
          <div class="update-item">
            <label>最后检查:</label>
            <span id="updateLastCheck">-</span>
          </div>
          <div class="update-item" id="updateProgressRow" style="display: none;">
            <label>下载进度:</label>
            <span id="updateProgress">0%</span>
          </div>
          <div class="update-item" id="updateErrorRow" style="display: none;">
            <label>最后错误:</label>
            <span id="updateError"></span>
          </div>
          <div class="update-actions">
            <button id="checkUpdateBtn" class="btn-secondary" type="button">检查更新</button>
            <button id="downloadUpdateBtn" class="btn-primary" type="button" style="display: none;">下载更新</button>
            <button id="installUpdateBtn" class="btn-success" type="button" style="display: none;">安装更新</button>
          </div>
        </div>
        <div class="update-compatibility" id="compatibilityBlock">
          <h4>系统兼容性</h4>
          <div id="compatibilitySummary">正在检测系统兼容性...</div>
          <div id="compatibilityWarnings" class="compatibility-warnings"></div>
          <div id="compatibilityActions" class="compatibility-actions"></div>
        </div>
      </div>
    `;

    const autoStartSection = settingsContainer.querySelector('.auto-start-config');
    if (autoStartSection) {
      autoStartSection.parentNode.insertBefore(
        updateSection,
        autoStartSection.nextSibling
      );
    } else {
      settingsContainer.appendChild(updateSection);
    }

    this.bindUpdateEvents();
    this.updateUI();
  }

  bindUpdateEvents() {
    const checkBtn = document.getElementById('checkUpdateBtn');
    const downloadBtn = document.getElementById('downloadUpdateBtn');
    const installBtn = document.getElementById('installUpdateBtn');

    if (checkBtn) {
      checkBtn.addEventListener('click', () => this.checkForUpdates());
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadUpdate());
    }

    if (installBtn) {
      installBtn.addEventListener('click', () => this.installUpdate());
    }
  }

  updateUI() {
    const versionElement = document.getElementById('currentVersion');
    if (versionElement) {
      versionElement.textContent = this.updateStatus.currentVersion;
    }

    const availableElement = document.getElementById('availableVersion');
    if (availableElement) {
      availableElement.textContent = this.updateStatus.availableVersion || '-';
    }

    const lastCheckElement = document.getElementById('updateLastCheck');
    if (lastCheckElement) {
      lastCheckElement.textContent = this.formatTimestamp(this.updateStatus.lastCheckAt);
    }

    const statusElement = document.getElementById('updateStatus');
    const checkBtn = document.getElementById('checkUpdateBtn');
    const downloadBtn = document.getElementById('downloadUpdateBtn');
    const installBtn = document.getElementById('installUpdateBtn');
    const progressRow = document.getElementById('updateProgressRow');
    const progressElement = document.getElementById('updateProgress');
    const errorRow = document.getElementById('updateErrorRow');
    const errorElement = document.getElementById('updateError');

    if (!statusElement) {
      return;
    }

    if (checkBtn) {
      checkBtn.disabled = false;
      checkBtn.textContent = '检查更新';
    }

    if (this.updateStatus.autoUpdateDisabled) {
      statusElement.textContent = this.getDisabledMessageFromStatus();
      statusElement.className = 'status-disabled';
      if (downloadBtn) {
        downloadBtn.style.display = 'none';
        downloadBtn.disabled = true;
      }
      if (installBtn) {
        installBtn.style.display = 'none';
        installBtn.disabled = true;
      }
    } else if (this.updateStatus.isChecking) {
      statusElement.textContent = '正在检查更新...';
      statusElement.className = 'status-checking';
      if (checkBtn) checkBtn.disabled = true;
      if (downloadBtn) downloadBtn.style.display = 'none';
      if (installBtn) installBtn.style.display = 'none';
    } else if (this.updateStatus.updateDownloaded) {
      statusElement.textContent = '更新已下载，可以安装';
      statusElement.className = 'status-ready';
      if (downloadBtn) downloadBtn.style.display = 'none';
      if (installBtn) {
        installBtn.style.display = 'inline-block';
        installBtn.disabled = false;
      }
    } else if (this.updateStatus.updateAvailable) {
      statusElement.textContent = '有新版本可用';
      statusElement.className = 'status-available';
      if (downloadBtn) {
        downloadBtn.style.display = 'inline-block';
        downloadBtn.disabled = false;
      }
      if (installBtn) {
        installBtn.style.display = 'none';
        installBtn.disabled = true;
      }
    } else {
      statusElement.textContent = '当前已是最新版本';
      statusElement.className = 'status-latest';
      if (downloadBtn) downloadBtn.style.display = 'none';
      if (installBtn) {
        installBtn.style.display = 'none';
        installBtn.disabled = true;
      }
    }

    if (progressRow && progressElement) {
      const progress = this.updateStatus.downloadProgress;
      if (progress && typeof progress.percent === 'number') {
        const parts = [`${progress.percent}%`];
        if (progress.transferred && progress.total) {
          parts.push(`${this.formatBytes(progress.transferred)} / ${this.formatBytes(progress.total)}`);
        }
        if (progress.speed) {
          parts.push(`${this.formatBytes(progress.speed)}/s`);
        }
        progressElement.textContent = parts.join(' ');
        progressRow.style.display = '';
      } else {
        progressRow.style.display = 'none';
        progressElement.textContent = '';
      }
    }

    if (errorRow && errorElement) {
      const lastError = this.updateStatus.lastError;
      if (lastError && lastError.message) {
        errorElement.textContent = lastError.message;
        errorRow.style.display = '';
      } else {
        errorRow.style.display = 'none';
        errorElement.textContent = '';
      }
    }

    this.compatibilityInfo = this.updateStatus.compatibility || this.compatibilityInfo || null;
    this.updateCompatibilityUI();
  }

  async checkForUpdates() {
    try {
      console.log('🔍 手动检查更新...');

      const checkBtn = document.getElementById('checkUpdateBtn');
      if (checkBtn) {
        checkBtn.disabled = true;
        checkBtn.textContent = '检查中...';
      }

      if (this.updateStatus.autoUpdateDisabled) {
        this.showNotification('更新检查', this.getDisabledMessageFromStatus());
        return;
      }

      const result = await window.electronAPI.checkForUpdates();

      if (result && result.compatibility) {
        this.compatibilityInfo = result.compatibility;
        this.updateStatus.compatibility = result.compatibility;
      }

      if (result && result.success) {
        this.showNotification('检查更新', result.message || '正在检查更新...');
      } else {
        const fallback =
          (result && result.message) || this.getDisabledMessageFromStatus() || '检查更新时发生错误';
        this.showNotification('检查更新', fallback);
      }

      setTimeout(() => {
        this.refreshUpdateStatus();
      }, 1500);
    } catch (error) {
      console.error('❌ 检查更新失败:', error);
      this.showNotification('检查更新失败', '检查更新时发生错误');
    } finally {
      const checkBtn = document.getElementById('checkUpdateBtn');
      if (checkBtn) {
        checkBtn.disabled = false;
        checkBtn.textContent = '检查更新';
      }
    }
  }

  async downloadUpdate() {
    try {
      console.log('📥 下载更新...');

      const downloadBtn = document.getElementById('downloadUpdateBtn');
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.textContent = '下载中...';
      }

      if (this.updateStatus.autoUpdateDisabled) {
        this.showNotification('下载更新', this.getDisabledMessageFromStatus());
        return;
      }

      const result = await window.electronAPI.downloadUpdate();

      if (result && result.compatibility) {
        this.compatibilityInfo = result.compatibility;
        this.updateStatus.compatibility = result.compatibility;
      }

      if (result && result.success) {
        this.showNotification('下载更新', result.message || '开始下载更新...');
      } else {
        const message = (result && result.message) || this.getDisabledMessageFromStatus() || '下载更新时发生错误';
        this.showNotification('下载失败', message);
      }

      setTimeout(() => {
        this.refreshUpdateStatus();
      }, 1500);
    } catch (error) {
      console.error('❌ 下载更新失败:', error);
      this.showNotification('下载失败', '下载更新时发生错误');
    } finally {
      const downloadBtn = document.getElementById('downloadUpdateBtn');
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '下载更新';
      }
    }
  }

  async installUpdate() {
    try {
      console.log('🔄 安装更新...');

      if (!confirm('安装更新需要重启应用程序，是否继续？')) {
        return;
      }

      const installBtn = document.getElementById('installUpdateBtn');
      if (installBtn) {
        installBtn.disabled = true;
        installBtn.textContent = '安装中...';
      }

      if (this.updateStatus.autoUpdateDisabled) {
        this.showNotification('安装失败', this.getDisabledMessageFromStatus());
        if (installBtn) {
          installBtn.disabled = false;
          installBtn.textContent = '安装更新';
        }
        return;
      }

      const result = await window.electronAPI.quitAndInstall();

      if (result && result.success) {
        this.showNotification('安装更新', result.message || '应用即将重启以完成更新');
      } else {
        const message = (result && result.message) || '安装更新时发生错误';
        this.showNotification('安装失败', message);
        if (installBtn) {
          installBtn.disabled = false;
          installBtn.textContent = '安装更新';
        }
      }
    } catch (error) {
      console.error('❌ 安装更新失败:', error);
      this.showNotification('安装失败', '安装更新时发生错误');
    }
  }

  getDisabledMessageFromStatus() {
    const reason = this.updateStatus.disabledReason;
    if (reason === 'unsupported-os') {
      return '当前系统版本不支持自动更新，请使用 legacy 安装包手动升级。';
    }
    if (reason === 'env-disabled') {
      return '自动更新已通过环境变量 MENUORG_DISABLE_AUTO_UPDATE 禁用。';
    }
    if (reason === 'core-build') {
      return '当前为核心精简版，不提供自动更新。';
    }
    return '自动更新已禁用。';
  }

  formatTimestamp(value) {
    if (!value) {
      return '未检查';
    }
    try {
      return new Date(value).toLocaleString();
    } catch (error) {
      return value;
    }
  }

  formatBytes(bytes) {
    if (!bytes) {
      return '0 B';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  updateCompatibilityUI() {
    const summaryEl = document.getElementById('compatibilitySummary');
    const warningsEl = document.getElementById('compatibilityWarnings');
    const actionsEl = document.getElementById('compatibilityActions');

    if (!summaryEl) {
      return;
    }

    const info = this.compatibilityInfo || this.updateStatus.compatibility;

    if (!info) {
      summaryEl.textContent = '正在检测系统兼容性...';
      if (warningsEl) warningsEl.style.display = 'none';
      if (actionsEl) actionsEl.style.display = 'none';
      return;
    }

    const summaryLines = [
      `平台: ${info.platform || '-'} (${info.arch || '-'})`,
      `推荐脚本: <code>${info.recommendedScript || 'npm run build:win:x64'}</code>`,
    ];
    if (info.recommendedPackageHint) {
      summaryLines.push(`推荐安装包: <code>${info.recommendedPackageHint}</code>`);
    }
    summaryEl.innerHTML = summaryLines.map((line) => `<div>${line}</div>`).join('');

    if (warningsEl) {
      if (Array.isArray(info.warnings) && info.warnings.length) {
        warningsEl.style.display = '';
        warningsEl.innerHTML = info.warnings
          .map((warning) => `<div>⚠️ ${warning}</div>`)
          .join('');
      } else {
        warningsEl.style.display = 'none';
        warningsEl.innerHTML = '';
      }
    }

    if (actionsEl) {
      if (info.supported === false) {
        actionsEl.style.display = '';
        actionsEl.innerHTML =
          '<div>⚠️ 当前系统不支持自动更新，请使用 legacy 安装包（详见文档《Release & Update》）。</div>';
      } else if (this.updateStatus.autoUpdateDisabled && this.updateStatus.disabledReason === 'env-disabled') {
        actionsEl.style.display = '';
        actionsEl.innerHTML =
          '<div>⚠️ 自动更新已被环境变量禁止，清除 MENUORG_DISABLE_AUTO_UPDATE 后可恢复。</div>';
      } else if (this.updateStatus.autoUpdateDisabled && this.updateStatus.disabledReason === 'core-build') {
        actionsEl.style.display = '';
        actionsEl.innerHTML =
          '<div>⚠️ 当前为核心精简版，仅保留基础功能，不提供自动更新。</div>';
      } else {
        actionsEl.style.display = 'none';
        actionsEl.innerHTML = '';
      }
    }
  }

  showNotification(title, message, type = 'info') {
    // 使用应用的通知系统
    if (window.electronAPI && window.electronAPI.showNotification) {
      window.electronAPI.showNotification({
        title: `MenuorgPrint - ${title}`,
        body: message,
      });
    }

    // 同时在控制台显示
    console.log(`📢 ${title}: ${message}`);
  }

  // 外部调用接口
  static async checkForUpdates() {
    if (window.updateManager) {
      await window.updateManager.checkForUpdates();
    }
  }

  static async getUpdateStatus() {
    if (window.updateManager) {
      await window.updateManager.refreshUpdateStatus();
      return window.updateManager.updateStatus;
    }
    return null;
  }
}

// 在页面加载完成后初始化更新管理器
document.addEventListener('DOMContentLoaded', () => {
  // 延迟初始化，确保其他组件已加载
  setTimeout(() => {
    window.updateManager = new UpdateManager();
  }, 1000);
});

// 导出给全局使用
window.UpdateManager = UpdateManager;














