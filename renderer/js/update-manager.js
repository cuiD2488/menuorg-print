/**
 * 前端更新管理器
 * 负责处理自动更新相关的UI交互
 */
class UpdateManager {
  constructor() {
    this.updateStatus = {
      isChecking: false,
      updateAvailable: false,
      updateDownloaded: false,
      currentVersion: '1.0.0',
    };

    this.init();
  }

  async init() {
    console.log('🔄 初始化更新管理器...');

    try {
      // 获取初始更新状态
      await this.refreshUpdateStatus();

      // 创建更新UI
      this.createUpdateUI();

      // 定期检查更新状态
      setInterval(() => {
        this.refreshUpdateStatus();
      }, 30000); // 30秒检查一次状态

      console.log('✅ 更新管理器初始化完成');
    } catch (error) {
      console.error('❌ 初始化更新管理器失败:', error);
    }
  }

  async refreshUpdateStatus() {
    try {
      const result = await window.electronAPI.getUpdateStatus();
      if (result.success) {
        this.updateStatus = {
          isChecking: result.isChecking,
          updateAvailable: result.updateAvailable,
          updateDownloaded: result.updateDownloaded,
          currentVersion: result.currentVersion,
        };

        this.updateUI();
      }
    } catch (error) {
      console.error('❌ 获取更新状态失败:', error);
    }
  }

  createUpdateUI() {
    // 在设置面板中添加更新相关的UI
    const settingsContainer = document.querySelector('.settings-content');
    if (!settingsContainer) {
      console.warn('⚠️ 未找到设置容器，跳过创建更新UI');
      return;
    }

    const updateSection = document.createElement('div');
    updateSection.className = 'update-section';
    updateSection.innerHTML = `
      <div class="setting-group">
        <h3>🔄 应用更新</h3>
        <div class="update-info">
          <div class="update-item">
            <label>当前版本:</label>
            <span id="currentVersion">${this.updateStatus.currentVersion}</span>
          </div>
          <div class="update-item">
            <label>更新状态:</label>
            <span id="updateStatus">检查中...</span>
          </div>
          <div class="update-actions">
            <button id="checkUpdateBtn" class="btn-secondary" type="button">检查更新</button>
            <button id="downloadUpdateBtn" class="btn-primary" type="button" style="display: none;">下载更新</button>
            <button id="installUpdateBtn" class="btn-success" type="button" style="display: none;">安装更新</button>
          </div>
        </div>
      </div>
    `;

    // 插入到设置面板的适当位置
    const autoStartSection = settingsContainer.querySelector('.setting-group');
    if (autoStartSection) {
      autoStartSection.parentNode.insertBefore(
        updateSection,
        autoStartSection.nextSibling
      );
    } else {
      settingsContainer.appendChild(updateSection);
    }

    // 绑定事件
    this.bindUpdateEvents();

    // 初始化UI状态
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
    // 更新当前版本显示
    const versionElement = document.getElementById('currentVersion');
    if (versionElement) {
      versionElement.textContent = this.updateStatus.currentVersion;
    }

    // 更新状态显示
    const statusElement = document.getElementById('updateStatus');
    const checkBtn = document.getElementById('checkUpdateBtn');
    const downloadBtn = document.getElementById('downloadUpdateBtn');
    const installBtn = document.getElementById('installUpdateBtn');

    if (!statusElement) return;

    if (this.updateStatus.isChecking) {
      statusElement.textContent = '正在检查更新...';
      statusElement.className = 'status-checking';
      if (checkBtn) checkBtn.disabled = true;
    } else if (this.updateStatus.updateDownloaded) {
      statusElement.textContent = '更新已下载，可以安装';
      statusElement.className = 'status-ready';
      if (checkBtn) checkBtn.disabled = false;
      if (downloadBtn) downloadBtn.style.display = 'none';
      if (installBtn) installBtn.style.display = 'inline-block';
    } else if (this.updateStatus.updateAvailable) {
      statusElement.textContent = '有新版本可用';
      statusElement.className = 'status-available';
      if (checkBtn) checkBtn.disabled = false;
      if (downloadBtn) downloadBtn.style.display = 'inline-block';
      if (installBtn) installBtn.style.display = 'none';
    } else {
      statusElement.textContent = '当前已是最新版本';
      statusElement.className = 'status-latest';
      if (checkBtn) checkBtn.disabled = false;
      if (downloadBtn) downloadBtn.style.display = 'none';
      if (installBtn) installBtn.style.display = 'none';
    }
  }

  async checkForUpdates() {
    try {
      console.log('🔍 手动检查更新...');

      const checkBtn = document.getElementById('checkUpdateBtn');
      if (checkBtn) {
        checkBtn.disabled = true;
        checkBtn.textContent = '检查中...';
      }

      const result = await window.electronAPI.checkForUpdates();

      if (result.success) {
        this.showNotification('检查更新', result.message);

        // 等待一段时间后刷新状态
        setTimeout(() => {
          this.refreshUpdateStatus();
        }, 2000);
      } else {
        this.showNotification(
          '检查更新失败',
          result.message || '检查更新时发生错误'
        );
      }

      // 恢复按钮状态
      setTimeout(() => {
        if (checkBtn) {
          checkBtn.disabled = false;
          checkBtn.textContent = '检查更新';
        }
      }, 3000);
    } catch (error) {
      console.error('❌ 检查更新失败:', error);
      this.showNotification('检查更新失败', '检查更新时发生错误');
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

      const result = await window.electronAPI.downloadUpdate();

      if (result.success) {
        this.showNotification('下载更新', result.message);

        // 等待一段时间后刷新状态
        setTimeout(() => {
          this.refreshUpdateStatus();
        }, 2000);
      } else {
        this.showNotification(
          '下载失败',
          result.message || '下载更新时发生错误'
        );
      }

      // 恢复按钮状态
      setTimeout(() => {
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.textContent = '下载更新';
        }
      }, 3000);
    } catch (error) {
      console.error('❌ 下载更新失败:', error);
      this.showNotification('下载失败', '下载更新时发生错误');
    }
  }

  async installUpdate() {
    try {
      console.log('🔄 安装更新...');

      // 确认安装
      if (!confirm('安装更新需要重启应用程序，是否继续？')) {
        return;
      }

      const installBtn = document.getElementById('installUpdateBtn');
      if (installBtn) {
        installBtn.disabled = true;
        installBtn.textContent = '安装中...';
      }

      const result = await window.electronAPI.quitAndInstall();

      if (result.success) {
        this.showNotification('安装更新', result.message);
      } else {
        this.showNotification(
          '安装失败',
          result.message || '安装更新时发生错误'
        );

        // 恢复按钮状态
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
