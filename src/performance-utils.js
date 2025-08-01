// 性能优化工具集
// 包含事件管理器、定时器管理器、缓存管理器等核心工具

// 🎯 优化的事件监听器管理器
class OptimizedEventManager {
  constructor() {
    this.eventListeners = new Map();
    this.boundMethods = new Map();
    this.isDestroyed = false;
  }

  // 添加事件监听器（带自动清理）
  addEventListener(target, event, handler, options = {}) {
    if (this.isDestroyed) {
      console.warn('[EventManager] 管理器已销毁，无法添加事件监听器');
      return;
    }

    const boundHandler = handler.bind(this);
    const key = `${event}_${handler.toString()}`;

    this.boundMethods.set(key, boundHandler);

    target.addEventListener(event, boundHandler, options);

    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }

    this.eventListeners.get(target).push({
      event,
      handler: boundHandler,
      originalHandler: handler,
      options,
      key,
    });

    console.log(`[EventManager] 已添加事件监听器: ${event}`);
  }

  // 移除特定事件监听器
  removeEventListener(target, event, handler) {
    const listeners = this.eventListeners.get(target);
    if (!listeners) return;

    const index = listeners.findIndex(
      (listener) =>
        listener.event === event && listener.originalHandler === handler
    );

    if (index !== -1) {
      const listener = listeners[index];
      target.removeEventListener(event, listener.handler);
      this.boundMethods.delete(listener.key);
      listeners.splice(index, 1);

      console.log(`[EventManager] 已移除事件监听器: ${event}`);
    }
  }

  // 清理所有事件监听器
  cleanup() {
    console.log(
      `[EventManager] 开始清理 ${this.eventListeners.size} 个目标的事件监听器`
    );

    for (const [target, listeners] of this.eventListeners) {
      listeners.forEach(({ event, handler }) => {
        try {
          target.removeEventListener(event, handler);
        } catch (error) {
          console.error(`[EventManager] 移除事件监听器失败: ${event}`, error);
        }
      });
    }

    this.eventListeners.clear();
    this.boundMethods.clear();
    this.isDestroyed = true;

    console.log('[EventManager] 所有事件监听器已清理');
  }

  // 获取状态信息
  getStats() {
    const stats = {
      targets: this.eventListeners.size,
      totalListeners: 0,
      listenersByTarget: {},
    };

    for (const [target, listeners] of this.eventListeners) {
      const targetName = target.constructor.name || 'Unknown';
      stats.totalListeners += listeners.length;
      stats.listenersByTarget[targetName] = listeners.length;
    }

    return stats;
  }
}

// 🕒 定时器管理器
class TimerManager {
  constructor() {
    this.timers = new Map();
    this.intervals = new Map();
    this.isDestroyed = false;
  }

  // 创建定时器
  setTimeout(callback, delay, name = null) {
    if (this.isDestroyed) {
      console.warn('[TimerManager] 管理器已销毁，无法创建定时器');
      return null;
    }

    const timerId = Date.now() + Math.random();
    const timer = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error(
          `[TimerManager] 定时器回调错误 (${name || timerId}):`,
          error
        );
      }

      if (name) this.timers.delete(name);
      else this.timers.delete(timerId);
    }, delay);

    const key = name || timerId;
    this.timers.set(key, {
      timer,
      type: 'timeout',
      delay,
      createTime: Date.now(),
      name: name || `timeout_${timerId}`,
    });

    return timer;
  }

  // 创建循环定时器
  setInterval(callback, interval, name = null) {
    if (this.isDestroyed) {
      console.warn('[TimerManager] 管理器已销毁，无法创建定时器');
      return null;
    }

    const timerId = Date.now() + Math.random();
    const timer = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error(
          `[TimerManager] 循环定时器回调错误 (${name || timerId}):`,
          error
        );
      }
    }, interval);

    const key = name || timerId;
    this.intervals.set(key, {
      timer,
      type: 'interval',
      interval,
      createTime: Date.now(),
      name: name || `interval_${timerId}`,
    });

    console.log(
      `[TimerManager] 已创建循环定时器: ${key} (间隔: ${interval}ms)`
    );
    return timer;
  }

  // 清除指定定时器
  clearTimer(name) {
    let cleared = false;

    if (this.timers.has(name)) {
      const { timer } = this.timers.get(name);
      clearTimeout(timer);
      this.timers.delete(name);
      cleared = true;
      console.log(`[TimerManager] 已清除定时器: ${name}`);
    }

    if (this.intervals.has(name)) {
      const { timer } = this.intervals.get(name);
      clearInterval(timer);
      this.intervals.delete(name);
      cleared = true;
      console.log(`[TimerManager] 已清除循环定时器: ${name}`);
    }

    if (!cleared) {
      console.warn(`[TimerManager] 未找到定时器: ${name}`);
    }
  }

  // 清除所有定时器
  clearAll() {
    console.log(
      `[TimerManager] 开始清理所有定时器 (${this.timers.size} 个定时器, ${this.intervals.size} 个循环定时器)`
    );

    for (const [name, { timer }] of this.timers) {
      clearTimeout(timer);
    }

    for (const [name, { timer }] of this.intervals) {
      clearInterval(timer);
    }

    this.timers.clear();
    this.intervals.clear();
    this.isDestroyed = true;

    console.log('[TimerManager] 所有定时器已清理');
  }

  // 获取状态信息
  getStats() {
    const now = Date.now();
    const timeoutStats = Array.from(this.timers.values()).map((timer) => ({
      name: timer.name,
      type: timer.type,
      delay: timer.delay,
      age: now - timer.createTime,
    }));

    const intervalStats = Array.from(this.intervals.values()).map((timer) => ({
      name: timer.name,
      type: timer.type,
      interval: timer.interval,
      age: now - timer.createTime,
    }));

    return {
      timeouts: {
        count: this.timers.size,
        details: timeoutStats,
      },
      intervals: {
        count: this.intervals.size,
        details: intervalStats,
      },
      total: this.timers.size + this.intervals.size,
    };
  }
}

// 🗂️ 智能缓存管理器
class SmartCacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.accessCount = new Map();
    this.lastAccess = new Map();
    this.defaultTTL = options.defaultTTL || 30000; // 30秒默认TTL
    this.maxSize = options.maxSize || 1000;
    this.cleanupInterval = options.cleanupInterval || 60000; // 1分钟清理间隔
    this.isDestroyed = false;

    // 定期清理过期缓存
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  // 设置缓存（带TTL）
  set(key, value, ttl = this.defaultTTL) {
    if (this.isDestroyed) {
      console.warn('[CacheManager] 缓存管理器已销毁，无法设置缓存');
      return;
    }

    // 检查缓存大小限制
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + ttl);
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    this.lastAccess.set(key, Date.now());

    console.log(`[CacheManager] 已缓存: ${key} (TTL: ${ttl}ms)`);
  }

  // 获取缓存
  get(key) {
    if (this.isDestroyed || !this.cache.has(key)) {
      return null;
    }

    const expiry = this.ttlMap.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    // 更新访问统计
    this.accessCount.set(key, this.accessCount.get(key) + 1);
    this.lastAccess.set(key, Date.now());

    return this.cache.get(key);
  }

  // 检查缓存是否存在且有效
  has(key) {
    if (!this.cache.has(key)) return false;

    const expiry = this.ttlMap.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  // 删除缓存
  delete(key) {
    if (this.cache.delete(key)) {
      this.ttlMap.delete(key);
      this.accessCount.delete(key);
      this.lastAccess.delete(key);
      console.log(`[CacheManager] 已删除缓存: ${key}`);
      return true;
    }
    return false;
  }

  // 清理过期缓存
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.ttlMap) {
      if (now > expiry) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[CacheManager] 清理了 ${cleanedCount} 个过期缓存项`);
    }
  }

  // LRU淘汰策略
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, time] of this.lastAccess) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      console.log(`[CacheManager] LRU淘汰缓存: ${oldestKey}`);
    }
  }

  // 清空所有缓存
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.ttlMap.clear();
    this.accessCount.clear();
    this.lastAccess.clear();
    console.log(`[CacheManager] 已清空所有缓存 (${size} 项)`);
  }

  // 获取缓存统计
  getStats() {
    const now = Date.now();
    const totalAccess = Array.from(this.accessCount.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalAccess,
      averageAccess: totalAccess / this.cache.size || 0,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  // 估算内存使用
  estimateMemoryUsage() {
    let size = 0;
    for (const [key, value] of this.cache) {
      size += JSON.stringify(key).length + JSON.stringify(value).length;
    }
    return `${Math.round(size / 1024)}KB`;
  }

  // 销毁缓存管理器
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
    this.isDestroyed = true;
    console.log('[CacheManager] 缓存管理器已销毁');
  }
}

// 🚀 性能工具函数
class PerformanceUtils {
  // 防抖函数
  static debounce(func, wait, immediate = false) {
    let timeout;
    let lastCallTime = 0;

    const debounced = function executedFunction(...args) {
      const callTime = Date.now();
      lastCallTime = callTime;

      const later = () => {
        timeout = null;
        if (!immediate && lastCallTime === callTime) {
          func.apply(this, args);
        }
      };

      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);

      if (callNow) {
        func.apply(this, args);
      }
    };

    debounced.cancel = () => {
      clearTimeout(timeout);
      timeout = null;
    };

    return debounced;
  }

  // 节流函数
  static throttle(func, limit) {
    let inThrottle;
    let lastFunc;
    let lastRan;

    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        lastRan = Date.now();
        inThrottle = true;
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }

  // 批量处理
  static async batchProcess(items, processor, batchSize = 10, delay = 0) {
    const results = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (item, index) => {
          try {
            return await processor(item, i + index);
          } catch (error) {
            console.error(
              `[PerformanceUtils] 批处理错误 (${i + index}):`,
              error
            );
            return { error: error.message, item };
          }
        })
      );

      results.push(...batchResults);

      // 批次间延迟，避免阻塞UI
      if (delay > 0 && i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return results;
  }

  // 内存使用监控
  static getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        usedMB: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        totalMB: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    return null;
  }

  // 性能计时器
  static createPerformanceTimer(name) {
    const startTime = performance.now();
    const startMark = `${name}-start`;

    performance.mark(startMark);

    return {
      end: () => {
        const endTime = performance.now();
        const endMark = `${name}-end`;
        const measureName = `${name}-duration`;

        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);

        const duration = endTime - startTime;
        console.log(`[PerformanceTimer] ${name}: ${duration.toFixed(2)}ms`);

        return duration;
      },
    };
  }

  // 等待下一个事件循环
  static nextTick() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  // 空闲时执行
  static requestIdleCallback(callback, options = {}) {
    if (window.requestIdleCallback) {
      return window.requestIdleCallback(callback, options);
    }

    // 降级方案
    return setTimeout(() => {
      const start = performance.now();
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (performance.now() - start)),
      });
    }, 1);
  }
}

// 🔍 内存监控器
class MemoryMonitor {
  constructor(options = {}) {
    this.measurements = [];
    this.maxMeasurements = options.maxMeasurements || 100;
    this.measureInterval = options.measureInterval || 30000; // 30秒
    this.warningThreshold = options.warningThreshold || 100 * 1024 * 1024; // 100MB
    this.criticalThreshold = options.criticalThreshold || 200 * 1024 * 1024; // 200MB
    this.listeners = new Map();

    this.startMonitoring();
  }

  // 开始监控
  startMonitoring() {
    this.measureTimer = setInterval(() => {
      this.measure();
    }, this.measureInterval);

    console.log('[MemoryMonitor] 内存监控已启动');
  }

  // 停止监控
  stopMonitoring() {
    if (this.measureTimer) {
      clearInterval(this.measureTimer);
      this.measureTimer = null;
    }
    console.log('[MemoryMonitor] 内存监控已停止');
  }

  // 执行测量
  measure() {
    const memory = PerformanceUtils.getMemoryUsage();
    if (!memory) return null;

    const measurement = {
      ...memory,
      timestamp: Date.now(),
    };

    this.measurements.push(measurement);

    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    // 检查阈值
    this.checkThresholds(measurement);

    return measurement;
  }

  // 检查阈值
  checkThresholds(measurement) {
    if (measurement.used > this.criticalThreshold) {
      this.emit('critical', measurement);
    } else if (measurement.used > this.warningThreshold) {
      this.emit('warning', measurement);
    }
  }

  // 事件发射
  emit(event, data) {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error(`[MemoryMonitor] 事件监听器错误 (${event}):`, error);
      }
    });
  }

  // 添加事件监听器
  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);
  }

  // 获取统计信息
  getStats() {
    if (this.measurements.length === 0) return null;

    const latest = this.measurements[this.measurements.length - 1];
    const oldest = this.measurements[0];
    const trend = latest.used - oldest.used;
    const duration = latest.timestamp - oldest.timestamp;
    const growthRate = duration > 0 ? trend / duration : 0;

    return {
      current: latest,
      trend: {
        bytes: trend,
        mb: Math.round(trend / 1024 / 1024),
        rate: growthRate,
        ratePerMinute: growthRate * 60000,
      },
      average: {
        used:
          this.measurements.reduce((sum, m) => sum + m.used, 0) /
          this.measurements.length,
        total:
          this.measurements.reduce((sum, m) => sum + m.total, 0) /
          this.measurements.length,
      },
      peak: Math.max(...this.measurements.map((m) => m.used)),
      isLeaking: this.checkForLeaks(),
    };
  }

  // 检查内存泄漏
  checkForLeaks() {
    const stats = this.getStats();
    if (!stats) return false;

    // 检查增长率
    const criticalGrowthRate = 1024 * 1024; // 1MB/秒
    const isRapidGrowth = stats.trend.rate > criticalGrowthRate;

    // 检查趋势
    const recentMeasurements = this.measurements.slice(-10);
    if (recentMeasurements.length < 10) return false;

    const increases = recentMeasurements.reduce((count, measurement, index) => {
      if (index === 0) return count;
      return measurement.used > recentMeasurements[index - 1].used
        ? count + 1
        : count;
    }, 0);

    const isSteadyIncrease = increases >= 8; // 80%的时间在增长

    return isRapidGrowth || isSteadyIncrease;
  }

  // 销毁监控器
  destroy() {
    this.stopMonitoring();
    this.measurements = [];
    this.listeners.clear();
    console.log('[MemoryMonitor] 内存监控器已销毁');
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.OptimizedEventManager = OptimizedEventManager;
  window.TimerManager = TimerManager;
  window.SmartCacheManager = SmartCacheManager;
  window.PerformanceUtils = PerformanceUtils;
  window.MemoryMonitor = MemoryMonitor;
}

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    OptimizedEventManager,
    TimerManager,
    SmartCacheManager,
    PerformanceUtils,
    MemoryMonitor,
  };
}
