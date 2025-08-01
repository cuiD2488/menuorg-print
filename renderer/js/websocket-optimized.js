// 优化的WebSocket客户端
// 修复内存泄漏，提升性能和稳定性

class OptimizedWebSocketClient {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.callbacks = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 100;
    this.reconnectInterval = 5000; // 减少重连间隔到2秒
    this.connectionTimeout = 15000; // 连接超时15秒

    // 心跳配置 - 更激进的心跳策略
    this.heartbeatInterval = 15000; // 减少到15秒一次心跳
    this.heartbeatTimeout = 6000; // 减少心跳超时到6秒
    this.maxMissedHeartbeats = 2; // 最多允许丢失2次心跳
    this.missedHeartbeats = 0;
    this.lastPongTime = null;

    // 连接质量监控
    this.connectionQuality = 'good'; // good, fair, poor
    this.latencyHistory = [];
    this.disconnectionCount = 0;
    this.lastConnectionTime = null;
    this.lastDisconnectionTime = null;

    // 网络监控
    this.networkOnline = navigator.onLine;
    this.lastNetworkCheck = Date.now();

    // 系统状态监控
    this.suspensionThreshold = 60000; // 减少到20秒检测系统休眠
    this.systemResumeTestTimeout = null;

    // 高级重连策略
    this.adaptiveReconnect = true;
    this.reconnectBackoffMultiplier = 1.2;
    this.maxReconnectInterval = 60000; // 最大重连间隔30秒

    // 🔧 强制保持连接配置 - 核心稳定性设置
    this.forceKeepAlive = true; // 强制保持连接，禁止主动断开
    this.allowHeartbeatDisconnect = false; // 禁用心跳超时断开
    this.allowHealthCheckDisconnect = false; // 禁用健康检查断开
    this.onlyDisconnectOnNetworkLoss = true; // 仅在网络完全丢失时断开

    // 性能优化管理器
    this.eventManager = new OptimizedEventManager();
    this.timerManager = new TimerManager();
    this.cacheManager = new SmartCacheManager({ defaultTTL: 60000 });

    // 状态管理
    this.connectionState = 'disconnected';
    this.lastMessageTime = null;
    this.lastActivityTime = Date.now();
    this.isDestroyed = false;

    // 消息队列（优化的）
    this.messageQueue = [];
    this.maxQueueSize = options.maxQueueSize || 100;
    this.batchSize = options.batchSize || 10;

    // 网络状态
    this.connectionQuality = 'unknown';
    this.networkType = 'unknown';

    // 系统监控 - 更敏感的休眠检测
    this.suspensionThreshold = 30000; // 30秒，更快检测系统休眠
    this.systemResumeTestTimeout = null; // 系统恢复测试超时

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

    // 注册网络事件监听
    this.setupNetworkMonitoring();

    // 注册系统事件监听
    this.setupSystemEventMonitoring();
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
          console.log('[OptimizedWebSocket] 页面变为可见');
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

  // 处理系统恢复
  handleSystemResume() {
    console.log('[OptimizedWebSocket] 检测到系统可能从休眠中恢复');

    // 立即检查连接状态
    if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
      console.log('[OptimizedWebSocket] 连接已断开，开始重连...');
      if (this.forceKeepAlive) {
        console.log(
          '[OptimizedWebSocket] 🔄 强制保持连接模式：直接重连而不关闭'
        );
        this.connect();
      } else {
        this.close();
        this.connect();
      }
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 连接似乎还在，但发送ping测试实际连通性
      console.log('[OptimizedWebSocket] 连接状态显示正常，发送ping测试...');
      this.sendHeartbeat();

      // 如果在3秒内没有收到pong，强制重连
      this.systemResumeTestTimeout = setTimeout(() => {
        if (this.forceKeepAlive) {
          console.warn(
            '[OptimizedWebSocket] ⚠️ ping测试超时，但强制保持连接模式已启用'
          );
          console.log('[OptimizedWebSocket] 🔄 将继续尝试心跳而不断开连接...');
          // 继续发送心跳，不强制断开
          if (this.isConnected()) {
            this.sendHeartbeat();
          }
        } else {
          console.log('[OptimizedWebSocket] ping测试超时，强制重连...');
          this.close();
          this.connect();
        }
      }, 3000);
    } else {
      console.log('[OptimizedWebSocket] 当前没有连接，开始连接...');
      this.connect();
    }

    // 更新活动时间
    this.lastActivityTime = Date.now();
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

        // 启动连接健康检查
        this.startConnectionHealthCheck();

        // 发送队列中的消息
        this.processMessageQueue();
      };

      // 接收消息
      this.ws.onmessage = (event) => {
        this.lastMessageTime = Date.now();
        this.lastActivityTime = Date.now();

        // 检查消息是否为有效的JSON格式
        try {
          const data = JSON.parse(event.data);

          // 🔧 调试：记录所有JSON消息
          console.log('[OptimizedWebSocket] 收到JSON消息:', {
            type: data.type,
            hasData: !!data.data,
            fullMessage: data,
          });

          // 处理心跳响应
          if (data.type === 'pong') {
            this.handleHeartbeatResponse(data);
            return;
          }

          // 根据消息类型分发事件
          if (data.type === 'order' || data.type === 'new_order') {
            console.log(
              '[OptimizedWebSocket] 🎯 订单消息，触发newOrder事件，数据:',
              data.data || data
            );
            this.emit('newOrder', data.data || data);
          } else if (data.type === 'order_update') {
            console.log('[OptimizedWebSocket] 📝 订单更新消息:', data);
            this.emit('orderUpdate', data);
          } else {
            // 🔧 增强：检查是否有其他可能的订单消息格式
            if (
              data.order_id ||
              data.id ||
              (data.data && (data.data.order_id || data.data.id))
            ) {
              console.warn(
                '[OptimizedWebSocket] ⚠️ 发现可能的订单消息但类型不匹配:',
                {
                  messageType: data.type,
                  orderId:
                    data.order_id ||
                    data.id ||
                    (data.data && (data.data.order_id || data.data.id)),
                  fullMessage: data,
                }
              );
            }
            console.log('[OptimizedWebSocket] 普通消息:', data);
            this.emit('message', data);
          }
        } catch (error) {
          // 如果不是有效的JSON，尝试处理为纯文本消息
          if (error instanceof SyntaxError) {
            // 处理特定的文本消息格式
            const textMessage = event.data.toString();

            // 将文本消息包装为标准格式（与其他WebSocket实现保持一致）
            const messageData = {
              type: 'text',
              content: textMessage,
              timestamp: Date.now(),
            };

            this.emit('message', messageData);
          } else {
            console.error('[OptimizedWebSocket] 消息解析错误:', error);
            this.emit('error', error);
          }
        }
      };

      // 连接关闭
      this.ws.onclose = (event) => {
        this.timerManager.clearTimer('connectionTimeout');

        const now = Date.now();
        console.log(
          `[OptimizedWebSocket] ⚠️ 连接关闭: ${event.code} - ${event.reason}`
        );
        console.log(
          `[OptimizedWebSocket] 断开时间: ${new Date(now).toISOString()}`
        );

        this.connectionState = 'disconnected';

        // 记录连接持续时间
        if (this.lastConnectionTime) {
          const duration = now - this.lastConnectionTime;
          console.log(`[OptimizedWebSocket] 连接持续时间: ${duration}ms`);
        }

        // 🔧 关键修复：记录断开时间，用于错过订单检测
        this.lastDisconnectionTime = now;
        this.disconnectionCount++;
        console.log(
          `[OptimizedWebSocket] 📋 已记录断开时间: ${new Date(
            now
          ).toISOString()}`
        );
        console.log(
          `[OptimizedWebSocket] 📊 累计断开次数: ${this.disconnectionCount}`
        );

        this.emit('disconnected', {
          code: event.code,
          reason: event.reason,
          connectionId: this.connectionId,
          disconnectionTime: now,
        });

        // 停止心跳和健康检查
        this.stopHeartbeat();
        this.stopConnectionHealthCheck();

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

  // 智能重连
  debounceReconnect() {
    this.timerManager.clearTimer('debounceReconnect');

    // 根据重连次数和连接质量调整重连间隔
    let interval = this.reconnectInterval;
    if (this.adaptiveReconnect) {
      interval = Math.min(
        this.reconnectInterval *
          Math.pow(this.reconnectBackoffMultiplier, this.reconnectAttempts),
        this.maxReconnectInterval
      );

      // 连接质量差时延长重连间隔
      if (this.connectionQuality === 'poor') {
        interval *= 1.5;
      }
    }

    console.log(
      `[OptimizedWebSocket] 🔄 ${interval}ms后尝试重连 (第${
        this.reconnectAttempts + 1
      }次)`
    );

    this.timerManager.setTimeout(
      () => {
        if (!this.isConnected() && !this.isDestroyed && this.networkOnline) {
          this.connect();
        }
      },
      interval,
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

      // console.log(
      //   `[OptimizedWebSocket] 💓 发送心跳 (已丢失: ${this.missedHeartbeats}/${this.maxMissedHeartbeats})`
      // );
      this.sendMessage(heartbeat);

      // 心跳超时检测
      this.timerManager.setTimeout(
        () => {
          this.missedHeartbeats++;
          console.warn(
            `[OptimizedWebSocket] ⚠️ 心跳超时 ${this.missedHeartbeats}/${this.maxMissedHeartbeats}`
          );

          if (this.missedHeartbeats >= this.maxMissedHeartbeats) {
            if (this.forceKeepAlive && !this.allowHeartbeatDisconnect) {
              console.warn(
                `[OptimizedWebSocket] ⚠️ 心跳连续超时 ${this.maxMissedHeartbeats} 次，但强制保持连接模式已启用，不断开连接`
              );
              console.warn(
                `[OptimizedWebSocket] 🔄 重置心跳计数器，继续尝试心跳（网络可能暂时不稳定）`
              );
              // 重置心跳计数器，给网络更多恢复时间
              this.missedHeartbeats = Math.floor(this.maxMissedHeartbeats / 2);
              // 发送一个测试心跳
              setTimeout(() => {
                if (this.isConnected()) {
                  this.sendHeartbeat();
                }
              }, 2000);
            } else {
              console.warn(
                `[OptimizedWebSocket] ❌ 心跳连续超时 ${this.maxMissedHeartbeats} 次，强制断开重连`
              );
              this.close();
              this.scheduleReconnect();
            }
          } else {
            console.log(
              `[OptimizedWebSocket] ⏳ 心跳超时但未达到最大次数 (${this.missedHeartbeats}/${this.maxMissedHeartbeats})，继续监控`
            );
          }
        },
        this.heartbeatTimeout,
        'heartbeatTimeout'
      );
    } else {
      console.warn('[OptimizedWebSocket] ⚠️ 尝试发送心跳但连接已断开');
    }
  }

  // 处理心跳响应
  handleHeartbeatResponse(data) {
    const now = Date.now();
    this.missedHeartbeats = 0;
    this.lastPongTime = now;
    this.timerManager.clearTimer('heartbeatTimeout');

    // 计算延迟
    let latency = 0;
    if (data.timestamp) {
      latency = now - data.timestamp;
      this.updateConnectionQuality(latency);
    }

    console.log(
      `[OptimizedWebSocket] 💚 收到心跳响应 (延迟: ${latency}ms, 质量: ${this.connectionQuality})`
    );

    // 清除系统恢复测试超时
    if (this.systemResumeTestTimeout) {
      clearTimeout(this.systemResumeTestTimeout);
      this.systemResumeTestTimeout = null;
      console.log('[OptimizedWebSocket] ✅ 系统恢复ping测试成功');
    }

    // 如果延迟过高，调整心跳间隔
    if (latency > 5000) {
      // 超过5秒延迟
      console.warn(
        `[OptimizedWebSocket] ⚠️ 网络延迟过高 (${latency}ms)，调整心跳频率`
      );
      this.heartbeatInterval = Math.min(this.heartbeatInterval * 1.2, 60000); // 最多延长到60秒
      this.startHeartbeat(); // 重新启动心跳以应用新间隔
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
    this.stopConnectionHealthCheck(); // 停止健康检查

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

  // 🔧 调试工具：测试新订单消息处理
  testNewOrderMessage(orderId = 'TEST_123') {
    const testOrderMessage = {
      type: 'new_order',
      data: {
        order_id: orderId,
        created_at: new Date().toISOString(),
      },
    };

    console.log('[OptimizedWebSocket] 🧪 发送测试订单消息:', testOrderMessage);

    // 模拟接收到消息
    const event = {
      data: JSON.stringify(testOrderMessage),
    };

    // 手动调用消息处理逻辑
    if (this.ws && this.ws.onmessage) {
      this.ws.onmessage(event);
    }
  }

  // 🔧 调试工具：记录连接信息
  logConnectionInfo() {
    console.log('[OptimizedWebSocket] 📊 连接信息:', {
      url: this.url,
      connectionState: this.connectionState,
      isConnected: this.isConnected(),
      lastMessageTime: this.lastMessageTime
        ? new Date(this.lastMessageTime).toISOString()
        : null,
      connectionId: this.connectionId,
      missedHeartbeats: this.missedHeartbeats,
      reconnectAttempts: this.reconnectAttempts,
    });
  }

  // 🔧 开始定期连接健康检查
  startConnectionHealthCheck() {
    // 先停止现有的健康检查
    this.stopConnectionHealthCheck();

    // 每隔60秒检查一次连接健康状况
    this.timerManager.setInterval(
      () => {
        console.log('[OptimizedWebSocket] 🔍 执行连接健康检查...');

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.log(
            '[OptimizedWebSocket] ⚠️ 健康检查发现连接已断开，重新连接...'
          );
          this.connect();
          return;
        }

        // 检查是否长时间没有收到消息
        const now = Date.now();
        const timeSinceLastMessage =
          now - (this.lastMessageTime || this.lastConnectionTime || now);

        if (timeSinceLastMessage > 120000) {
          // 2分钟没有任何消息
          console.log(
            '[OptimizedWebSocket] ⚠️ 长时间无消息，发送健康检查ping...'
          );
          this.sendHeartbeat(); // 使用现有的心跳方法

          // 如果10秒内没有收到pong，强制重连
          setTimeout(() => {
            const timeSinceLastPong = now - (this.lastPongTime || 0);
            if (timeSinceLastPong > 10000) {
              if (this.forceKeepAlive && !this.allowHealthCheckDisconnect) {
                console.warn(
                  '[OptimizedWebSocket] ⚠️ 健康检查ping无响应，但强制保持连接模式已启用，不断开连接'
                );
                console.log(
                  '[OptimizedWebSocket] 🔄 将在30秒后再次尝试健康检查...'
                );
                // 延长下次健康检查时间，给网络更多恢复时间
                setTimeout(() => {
                  if (this.isConnected()) {
                    this.sendHeartbeat();
                  }
                }, 30000);
              } else {
                console.log(
                  '[OptimizedWebSocket] ❌ 健康检查ping无响应，强制重连...'
                );
                this.close();
                this.connect();
              }
            }
          }, 10000);
        } else {
          console.log('[OptimizedWebSocket] ✅ 连接健康检查通过');
        }
      },
      60000,
      'healthCheck'
    ); // 每60秒检查一次，使用字符串ID
  }

  // 🛑 停止连接健康检查
  stopConnectionHealthCheck() {
    this.timerManager.clearTimer('healthCheck');
    console.log('[OptimizedWebSocket] 已停止连接健康检查');
  }

  // 🔧 获取最后断开时间
  getLastDisconnectionTime() {
    return this.lastDisconnectionTime;
  }

  // 🔧 清除断开时间记录
  clearDisconnectionTime() {
    console.log('[OptimizedWebSocket] 🗑️ 清除断开时间记录');
    this.lastDisconnectionTime = null;
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

  // 设置网络监控
  setupNetworkMonitoring() {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      console.log('[OptimizedWebSocket] 🌐 网络已连接');
      this.networkOnline = true;
      this.handleNetworkChange();
    });

    window.addEventListener('offline', () => {
      console.log('[OptimizedWebSocket] 🌐 网络已断开');
      this.networkOnline = false;
      this.handleNetworkChange();
    });

    // 定期检查网络状态
    this.timerManager.setInterval(
      () => {
        this.checkNetworkStatus();
      },
      10000,
      'networkCheck'
    );
  }

  // 设置系统事件监听
  setupSystemEventMonitoring() {
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[OptimizedWebSocket] 📱 页面变为可见，检查连接状态');
        this.handleSystemResume();
      }
    });

    // 监听窗口焦点变化
    window.addEventListener('focus', () => {
      console.log('[OptimizedWebSocket] 🎯 窗口获得焦点，检查连接状态');
      this.handleSystemResume();
    });
  }

  // 处理网络状态变化
  handleNetworkChange() {
    this.lastNetworkCheck = Date.now();

    if (this.networkOnline) {
      if (!this.isConnected()) {
        console.log('[OptimizedWebSocket] 🔄 网络恢复，尝试重连...');
        setTimeout(() => this.connect(), 1000);
      }
    } else {
      if (this.isConnected()) {
        if (this.forceKeepAlive && this.onlyDisconnectOnNetworkLoss) {
          // 检查是否真的网络断开还是暂时波动
          console.warn(
            '[OptimizedWebSocket] ⚠️ 检测到网络状态变化，但保持连接模式已启用'
          );
          console.log('[OptimizedWebSocket] 🔍 进行网络连通性测试...');

          // 等待5秒再检查网络状态，避免因短暂波动断开
          setTimeout(() => {
            if (!navigator.onLine) {
              console.log('[OptimizedWebSocket] 🚫 确认网络真的断开，关闭连接');
              this.close();
            } else {
              console.log('[OptimizedWebSocket] ✅ 网络已恢复，保持连接');
              // 发送一个测试心跳确认连接
              if (this.isConnected()) {
                this.sendHeartbeat();
              }
            }
          }, 5000);
        } else {
          console.log('[OptimizedWebSocket] 🚫 网络断开，关闭连接');
          this.close();
        }
      }
    }
  }

  // 检查网络状态
  checkNetworkStatus() {
    const wasOnline = this.networkOnline;
    this.networkOnline = navigator.onLine;

    if (wasOnline !== this.networkOnline) {
      console.log(
        `[OptimizedWebSocket] 🌐 网络状态变化: ${
          wasOnline ? '在线' : '离线'
        } -> ${this.networkOnline ? '在线' : '离线'}`
      );
      this.handleNetworkChange();
    }

    // 如果网络在线但WebSocket断开，尝试重连
    if (this.networkOnline && !this.isConnected() && !this.isDestroyed) {
      const timeSinceLastCheck = Date.now() - this.lastNetworkCheck;
      if (timeSinceLastCheck > 30000) {
        // 30秒后尝试重连
        console.log(
          '[OptimizedWebSocket] 🔄 网络在线但WebSocket断开，尝试重连'
        );
        this.connect();
      }
    }
  }

  // 更新连接质量评估
  updateConnectionQuality(latency) {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > 10) {
      this.latencyHistory.shift();
    }

    const avgLatency =
      this.latencyHistory.reduce((a, b) => a + b, 0) /
      this.latencyHistory.length;

    if (avgLatency < 200) {
      this.connectionQuality = 'good';
    } else if (avgLatency < 500) {
      this.connectionQuality = 'fair';
    } else {
      this.connectionQuality = 'poor';
    }

    // 根据连接质量动态调整心跳间隔
    if (this.connectionQuality === 'poor') {
      this.heartbeatInterval = Math.min(25000, this.heartbeatInterval + 2000);
    } else if (this.connectionQuality === 'good') {
      this.heartbeatInterval = Math.max(10000, this.heartbeatInterval - 1000);
    }

    console.log(
      `[OptimizedWebSocket] 📊 连接质量: ${
        this.connectionQuality
      }, 平均延迟: ${avgLatency.toFixed(0)}ms, 心跳间隔: ${
        this.heartbeatInterval
      }ms`
    );
  }

  // 强制保持连接的监控和调试方法
  getConnectionStabilityReport() {
    return {
      forceKeepAlive: this.forceKeepAlive,
      allowHeartbeatDisconnect: this.allowHeartbeatDisconnect,
      allowHealthCheckDisconnect: this.allowHealthCheckDisconnect,
      onlyDisconnectOnNetworkLoss: this.onlyDisconnectOnNetworkLoss,
      connectionState: this.connectionState,
      missedHeartbeats: this.missedHeartbeats,
      maxMissedHeartbeats: this.maxMissedHeartbeats,
      disconnectionCount: this.disconnectionCount,
      connectionQuality: this.connectionQuality,
      networkOnline: this.networkOnline,
      lastConnectionTime: this.lastConnectionTime
        ? new Date(this.lastConnectionTime).toISOString()
        : null,
      lastDisconnectionTime: this.lastDisconnectionTime
        ? new Date(this.lastDisconnectionTime).toISOString()
        : null,
      lastPongTime: this.lastPongTime
        ? new Date(this.lastPongTime).toISOString()
        : null,
      heartbeatInterval: this.heartbeatInterval,
      heartbeatTimeout: this.heartbeatTimeout,
      isConnected: this.isConnected(),
      timeSinceLastPong: this.lastPongTime
        ? Date.now() - this.lastPongTime
        : null,
    };
  }

  // 强制重置心跳计数器
  forceResetHeartbeat() {
    if (this.forceKeepAlive) {
      console.log('[OptimizedWebSocket] 🔄 强制重置心跳计数器');
      this.missedHeartbeats = 0;
      this.timerManager.clearTimer('heartbeatTimeout');

      // 立即发送一个心跳测试连接
      if (this.isConnected()) {
        this.sendHeartbeat();
      }

      return true;
    }
    return false;
  }

  // 启用/禁用强制保持连接模式
  setForceKeepAlive(enabled) {
    this.forceKeepAlive = enabled;
    this.allowHeartbeatDisconnect = !enabled;
    this.allowHealthCheckDisconnect = !enabled;
    this.onlyDisconnectOnNetworkLoss = enabled;

    console.log(
      `[OptimizedWebSocket] ${enabled ? '✅ 启用' : '❌ 禁用'}强制保持连接模式`
    );
    console.log(`[OptimizedWebSocket] 配置详情:`, {
      forceKeepAlive: this.forceKeepAlive,
      allowHeartbeatDisconnect: this.allowHeartbeatDisconnect,
      allowHealthCheckDisconnect: this.allowHealthCheckDisconnect,
      onlyDisconnectOnNetworkLoss: this.onlyDisconnectOnNetworkLoss,
    });

    if (enabled && this.isConnected()) {
      // 立即重置计数器，确保不会因为之前的超时而断开
      this.forceResetHeartbeat();
    }
  }

  // 连接状态详细报告
  logConnectionStatus() {
    const report = this.getConnectionStabilityReport();
    console.group('[OptimizedWebSocket] 📊 连接状态详细报告');
    console.log('🔗 连接状态:', report.connectionState);
    console.log('🔒 强制保持连接:', report.forceKeepAlive ? '启用' : '禁用');
    console.log(
      '💓 心跳状态:',
      `${report.missedHeartbeats}/${report.maxMissedHeartbeats} 丢失`
    );
    console.log('📡 网络状态:', report.networkOnline ? '在线' : '离线');
    console.log('📈 连接质量:', report.connectionQuality);
    console.log('📊 断开次数:', report.disconnectionCount);
    console.log('⏰ 最后心跳:', report.lastPongTime || '无');
    console.log('⏱️ 心跳间隔:', report.heartbeatInterval + 'ms');
    console.log('⏳ 心跳超时:', report.heartbeatTimeout + 'ms');
    if (report.timeSinceLastPong) {
      console.log(
        '🕐 距离最后心跳:',
        Math.round(report.timeSinceLastPong / 1000) + '秒'
      );
    }
    console.groupEnd();
    return report;
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
