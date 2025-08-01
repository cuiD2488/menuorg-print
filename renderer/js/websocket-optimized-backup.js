// 优化的WebSocket客户端
// 修复内存泄漏，提升性能和稳定性

class OptimizedWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.callbacks = {};
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 50;
    this.reconnectAttempts = 0;
    this.isManualClose = false;
    this.connectionId = this.generateConnectionId();

    // 心跳配置
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimeout = options.heartbeatTimeout || 10000;
    this.maxMissedHeartbeats = options.maxMissedHeartbeats || 3;

    // 性能优化管理器
    this.eventManager = new OptimizedEventManager();
    this.timerManager = new TimerManager();
    this.cacheManager = new SmartCacheManager({ defaultTTL: 60000 });

    // 状态管理
    this.connectionState = 'disconnected';
    this.lastConnectionTime = null;
    this.lastMessageTime = null;
    this.lastActivityTime = Date.now();
    this.missedHeartbeats = 0;
    this.isDestroyed = false;

    // 消息队列（优化的）
    this.messageQueue = [];
    this.maxQueueSize = options.maxQueueSize || 100;
    this.batchSize = options.batchSize || 10;

    // 网络状态
    this.connectionQuality = 'unknown';
    this.networkType = 'unknown';

    // 系统监控
    this.suspensionThreshold = 60000; // 1分钟

    // 初始化监听器（优化的）
    this.setupOptimizedListeners();

    console.log('[OptimizedWebSocket] 客户端初始化完成');
  }

  // 生成连接ID
  generateConnectionId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 优化的事件监听器设置
  setupOptimizedListeners() {
    // 网络状态监听（优化的）
    this.setupNetworkListeners();

    // 页面状态监听（优化的）
    this.setupPageStateListeners();

    // 系统监控（优化的）
    this.setupSystemMonitoring();
  }

  // 网络状态监听（移除了频繁触发的事件）
  setupNetworkListeners() {
    // 网络连接状态
    this.eventManager.addEventListener(window, 'online', () => {
      console.log('[OptimizedWebSocket] 网络已连接');
      this.networkType = this.detectNetworkType();
      this.emit('networkOnline');
      this.handleNetworkRestore();
    });

    this.eventManager.addEventListener(window, 'offline', () => {
      console.log('[OptimizedWebSocket] 网络已断开');
      this.networkType = 'offline';
      this.emit('networkOffline');
    });

    // 网络类型变化监听
    if ('connection' in navigator && navigator.connection) {
      this.eventManager.addEventListener(
        navigator.connection,
        'change',
        PerformanceUtils.throttle(() => {
          const newType = this.detectNetworkType();
          if (newType !== this.networkType) {
            console.log(
              `[OptimizedWebSocket] 网络类型变化: ${this.networkType} -> ${newType}`
            );
            this.networkType = newType;
            this.adaptToNetworkConditions();
          }
        }, 5000) // 5秒节流
      );
    }
  }

  // 页面状态监听（优化的）
  setupPageStateListeners() {
    // 页面可见性变化
    this.eventManager.addEventListener(
      document,
      'visibilitychange',
      PerformanceUtils.debounce(() => {
        if (document.visibilityState === 'visible') {
          this.handlePageVisible();
        } else {
          console.log('[OptimizedWebSocket] 页面变为隐藏');
          this.handlePageHidden();
        }
      }, 1000) // 1秒防抖
    );

    // 窗口焦点（节流处理）
    this.eventManager.addEventListener(
      window,
      'focus',
      PerformanceUtils.throttle(() => {
        this.handleWindowFocus();
      }, 2000) // 2秒节流
    );
  }

  // 系统监控（大幅优化）
  setupSystemMonitoring() {
    // 移除高频事件监听器，使用更优化的方案

    // 只监听关键用户活动（大幅减少事件）
    const updateActivity = PerformanceUtils.throttle(() => {
      this.lastActivityTime = Date.now();
    }, 5000); // 5秒节流，大幅减少触发频率

    // 只监听关键事件，移除mousemove等高频事件
    this.eventManager.addEventListener(document, 'mousedown', updateActivity, {
      passive: true,
    });
    this.eventManager.addEventListener(document, 'keydown', updateActivity, {
      passive: true,
    });
    this.eventManager.addEventListener(document, 'click', updateActivity, {
      passive: true,
    });

    // 定期系统状态检查（降低频率）
    this.timerManager.setInterval(
      () => {
        this.checkSystemStatus();
      },
      60000,
      'systemCheck'
    ); // 1分钟检查一次
  }

  // 处理网络恢复
  handleNetworkRestore() {
    if (!this.isConnected()) {
      this.resetReconnectAttempts();
      this.debounceReconnect();
    }
  }

  // 处理页面可见
  handlePageVisible() {
    this.checkSystemResume();

    if (!this.isConnected()) {
      this.resetReconnectAttempts();
      this.debounceReconnect();
    } else {
      // 发送心跳检查连接质量
      this.sendHeartbeat();
    }
  }

  // 处理页面隐藏
  handlePageHidden() {
    // 页面隐藏时适当降低心跳频率
    this.adaptHeartbeatInterval();
  }

  // 处理窗口焦点
  handleWindowFocus() {
    this.checkSystemResume();
  }

  // 检查系统状态
  checkSystemStatus() {
    const now = Date.now();
    const timeDiff = now - this.lastActivityTime;

    // 检查系统是否可能休眠
    if (timeDiff > this.suspensionThreshold) {
      console.log(
        `[OptimizedWebSocket] 检测到可能的系统休眠，时间差: ${timeDiff}ms`
      );
      this.handleSystemResume();
    }
  }

  // 检测网络类型
  detectNetworkType() {
    if (!navigator.onLine) return 'offline';

    if ('connection' in navigator && navigator.connection) {
      const conn = navigator.connection;
      return conn.effectiveType || conn.type || 'unknown';
    }

    return 'unknown';
  }

  // 适应网络条件
  adaptToNetworkConditions() {
    switch (this.networkType) {
      case 'slow-2g':
      case '2g':
        this.heartbeatInterval = 60000; // 1分钟
        this.reconnectInterval = 10000; // 10秒
        break;
      case '3g':
        this.heartbeatInterval = 45000; // 45秒
        this.reconnectInterval = 7000; // 7秒
        break;
      case '4g':
      default:
        this.heartbeatInterval = 30000; // 30秒
        this.reconnectInterval = 5000; // 5秒
        break;
    }

    console.log(`[OptimizedWebSocket] 已适应网络条件: ${this.networkType}`);
  }

  // 事件发射器
  emit(event, data) {
    const handlers = this.callbacks[event] || [];
    handlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[OptimizedWebSocket] 事件处理器错误 (${event}):`, error);
      }
    });
  }

  // 添加事件监听器
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  // 移除事件监听器
  off(event, callback) {
    if (!this.callbacks[event]) return;

    const index = this.callbacks[event].indexOf(callback);
    if (index > -1) {
      this.callbacks[event].splice(index, 1);
    }
  }

  // 连接WebSocket（优化的）
  async connect() {
    if (this.isDestroyed) {
      console.warn('[OptimizedWebSocket] 客户端已销毁，无法连接');
      return;
    }

    if (this.connectionState === 'connecting') {
      console.log('[OptimizedWebSocket] 连接正在进行中...');
      return;
    }

    try {
      console.log(
        `[OptimizedWebSocket] 正在连接... (尝试 ${this.reconnectAttempts + 1}/${
          this.maxReconnectAttempts
        })`
      );

      this.connectionState = 'connecting';
      this.emit('connecting', {
        attempt: this.reconnectAttempts + 1,
        connectionId: this.connectionId,
      });

      // 创建WebSocket连接
      this.ws = new WebSocket(this.url);

      // 连接超时处理
      const connectionTimeout = this.timerManager.setTimeout(
        () => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            console.error('[OptimizedWebSocket] 连接超时');
            this.ws.close();
            this.handleConnectionFailure(new Error('连接超时'));
          }
        },
        10000,
        'connectionTimeout'
      );

      // 连接成功
      this.ws.onopen = (event) => {
        this.timerManager.clearTimer('connectionTimeout');

        console.log('[OptimizedWebSocket] ✅ 连接成功');
        this.connectionState = 'connected';
        this.lastConnectionTime = Date.now();
        this.reconnectAttempts = 0;
        this.isManualClose = false;

        this.emit('connected', {
          event,
          connectionId: this.connectionId,
          timestamp: this.lastConnectionTime,
        });

        // 启动心跳
        this.startHeartbeat();

        // 发送队列中的消息
        this.processMessageQueue();
      };

      // 接收消息
      this.ws.onmessage = (event) => {
        this.lastMessageTime = Date.now();
        this.lastActivityTime = Date.now();

        try {
          const data = JSON.parse(event.data);

          // 处理心跳响应
          if (data.type === 'pong') {
            this.handleHeartbeatResponse(data);
            return;
          }

          this.emit('message', data);
        } catch (error) {
          console.error('[OptimizedWebSocket] 消息解析错误:', error);
          this.emit('error', error);
        }
      };

      // 连接关闭
      this.ws.onclose = (event) => {
        this.timerManager.clearTimer('connectionTimeout');

        console.log(
          `[OptimizedWebSocket] 连接关闭: ${event.code} - ${event.reason}`
        );
        this.connectionState = 'disconnected';

        // 记录连接持续时间
        if (this.lastConnectionTime) {
          const duration = Date.now() - this.lastConnectionTime;
          console.log(`[OptimizedWebSocket] 连接持续时间: ${duration}ms`);
        }

        this.emit('disconnected', {
          code: event.code,
          reason: event.reason,
          connectionId: this.connectionId,
        });

        // 停止心跳
        this.stopHeartbeat();

        // 处理重连
        this.handleDisconnection(event);
      };

      // 连接错误
      this.ws.onerror = (error) => {
        this.timerManager.clearTimer('connectionTimeout');
        console.error('[OptimizedWebSocket] 连接错误:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('[OptimizedWebSocket] 连接异常:', error);
      this.handleConnectionFailure(error);
    }
  }

  // 处理连接失败
  handleConnectionFailure(error) {
    this.connectionState = 'disconnected';
    this.emit('error', error);
    this.scheduleReconnect();
  }

  // 处理断开连接
  handleDisconnection(event) {
    if (
      !this.isManualClose &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[OptimizedWebSocket] ❌ 达到最大重连次数');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  // 安排重连（防抖处理）
  scheduleReconnect() {
    if (this.isDestroyed || this.isManualClose) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // 最大30秒
    );

    console.log(
      `[OptimizedWebSocket] ${delay}ms 后重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.timerManager.setTimeout(
      () => {
        if (!this.isDestroyed && !this.isManualClose) {
          this.connect();
        }
      },
      delay,
      'reconnectTimer'
    );
  }

  // 防抖重连
  debounceReconnect() {
    this.timerManager.clearTimer('debounceReconnect');
    this.timerManager.setTimeout(
      () => {
        if (!this.isConnected() && !this.isDestroyed) {
          this.connect();
        }
      },
      3000,
      'debounceReconnect'
    );
  }

  // 启动心跳
  startHeartbeat() {
    this.stopHeartbeat();

    this.timerManager.setInterval(
      () => {
        this.sendHeartbeat();
      },
      this.heartbeatInterval,
      'heartbeat'
    );

    console.log(
      `[OptimizedWebSocket] 心跳已启动 (间隔: ${this.heartbeatInterval}ms)`
    );
  }

  // 停止心跳
  stopHeartbeat() {
    this.timerManager.clearTimer('heartbeat');
    console.log('[OptimizedWebSocket] 心跳已停止');
  }

  // 发送心跳
  sendHeartbeat() {
    if (this.isConnected()) {
      const heartbeat = {
        type: 'ping',
        timestamp: Date.now(),
        connectionId: this.connectionId,
      };

      this.sendMessage(heartbeat);

      // 心跳超时检测
      this.timerManager.setTimeout(
        () => {
          this.missedHeartbeats++;

          if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
            console.warn('[OptimizedWebSocket] 心跳超时，断开连接');
            this.close();
            this.scheduleReconnect();
          }
        },
        this.heartbeatTimeout,
        'heartbeatTimeout'
      );
    }
  }

  // 处理心跳响应
  handleHeartbeatResponse(data) {
    this.missedHeartbeats = 0;
    this.timerManager.clearTimer('heartbeatTimeout');

    // 计算延迟
    if (data.timestamp) {
      const latency = Date.now() - data.timestamp;
      this.updateConnectionQuality(latency);
    }
  }

  // 更新连接质量
  updateConnectionQuality(latency) {
    if (latency < 100) {
      this.connectionQuality = 'excellent';
    } else if (latency < 300) {
      this.connectionQuality = 'good';
    } else if (latency < 1000) {
      this.connectionQuality = 'fair';
    } else {
      this.connectionQuality = 'poor';
    }
  }

  // 适应心跳间隔
  adaptHeartbeatInterval() {
    const baseInterval = 30000;

    if (document.visibilityState === 'hidden') {
      this.heartbeatInterval = baseInterval * 2; // 页面隐藏时降低频率
    } else {
      this.heartbeatInterval = baseInterval;
    }

    // 重启心跳以应用新间隔
    if (this.isConnected()) {
      this.startHeartbeat();
    }
  }

  // 发送消息（优化的）
  sendMessage(data) {
    if (this.isDestroyed) {
      console.warn('[OptimizedWebSocket] 客户端已销毁，无法发送消息');
      return false;
    }

    if (this.isConnected()) {
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.ws.send(message);
        this.lastActivityTime = Date.now();
        return true;
      } catch (error) {
        console.error('[OptimizedWebSocket] 发送消息失败:', error);
        this.emit('error', error);
        return false;
      }
    } else {
      // 添加到队列
      this.queueMessage(data);
      return false;
    }
  }

  // 消息入队
  queueMessage(data) {
    if (this.messageQueue.length >= this.maxQueueSize) {
      console.warn('[OptimizedWebSocket] 消息队列已满，移除最旧的消息');
      this.messageQueue.shift();
    }

    this.messageQueue.push({
      data,
      timestamp: Date.now(),
    });
  }

  // 处理消息队列
  async processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(
      `[OptimizedWebSocket] 处理消息队列 (${this.messageQueue.length} 条消息)`
    );

    // 批量处理消息
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    for (const { data } of messages) {
      if (!this.isConnected()) break;

      this.sendMessage(data);

      // 批次间小延迟，避免阻塞
      await PerformanceUtils.nextTick();
    }
  }

  // 检查系统恢复
  checkSystemResume() {
    const now = Date.now();
    const timeDiff = now - this.lastActivityTime;

    if (timeDiff > this.suspensionThreshold) {
      console.log(`[OptimizedWebSocket] 检测到系统恢复，时间差: ${timeDiff}ms`);
      this.lastActivityTime = now;
      this.emit('systemWakeup', { suspendTime: timeDiff });

      if (!this.isConnected()) {
        this.resetReconnectAttempts();
        this.debounceReconnect();
      }
    }
  }

  // 重置重连计数
  resetReconnectAttempts() {
    this.reconnectAttempts = 0;
  }

  // 检查连接状态
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // 关闭连接
  close() {
    console.log('[OptimizedWebSocket] 手动关闭连接');
    this.isManualClose = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
    }
  }

  // 获取状态信息
  getStatus() {
    return {
      connectionState: this.connectionState,
      isConnected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      connectionQuality: this.connectionQuality,
      networkType: this.networkType,
      lastConnectionTime: this.lastConnectionTime,
      lastMessageTime: this.lastMessageTime,
      queueSize: this.messageQueue.length,
      heartbeatInterval: this.heartbeatInterval,
      missedHeartbeats: this.missedHeartbeats,
      connectionId: this.connectionId,
    };
  }

  // 获取性能统计
  getPerformanceStats() {
    return {
      events: this.eventManager.getStats(),
      timers: this.timerManager.getStats(),
      cache: this.cacheManager.getStats(),
      memory: PerformanceUtils.getMemoryUsage(),
    };
  }

  // 销毁客户端
  destroy() {
    console.log('[OptimizedWebSocket] 开始销毁客户端...');

    this.isDestroyed = true;
    this.isManualClose = true;

    // 清理连接
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    // 清理管理器
    this.eventManager.cleanup();
    this.timerManager.clearAll();
    this.cacheManager.destroy();

    // 清理数据
    this.callbacks = {};
    this.messageQueue = [];

    console.log('[OptimizedWebSocket] 客户端已销毁');
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.OptimizedWebSocketClient = OptimizedWebSocketClient;
}

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptimizedWebSocketClient;
}
