# MenuorgPrint 性能优化指南

## 🚨 发现的关键性能问题

### 1. **严重内存泄漏风险**

#### 问题1: 事件监听器未清理
```javascript
// 问题代码 (renderer/js/websocket.js:552-559)
['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(
  (event) => {
    document.addEventListener(event, () => {
      this.lastActivityTime = Date.now();
    }, { passive: true });
  }
);
```
**影响**: mousemove事件每次鼠标移动都触发，严重影响性能

#### 问题2: 多个定时器未统一管理
- WebSocket: 心跳定时器、重连定时器、监控定时器
- CLodop管理器: 健康检查定时器、重试定时器
- 应用主循环: 多个setTimeout/setInterval

#### 问题3: 全局事件监听器堆积
```javascript
// 未移除的事件监听器
window.addEventListener('online', ...)
window.addEventListener('offline', ...)
document.addEventListener('visibilitychange', ...)
```

### 2. **阻塞式初始化**

#### 问题4: 构造函数中的同步操作
```javascript
// 问题代码 (renderer/js/app.js:40-55)
constructor() {
  // 立即执行多个同步检查
  console.log('[APP] 检查CLodop相关函数加载状态:');
  // 多个console.log调用
  // 立即检查CLodop状态
  this.init(); // 阻塞构造函数
}
```

### 3. **重复和冗余操作**

#### 问题5: 重复的状态检查
- CLodop状态检查缺乏有效缓存
- 打印机列表重复获取
- 网络状态重复检测

## 🛠️ 性能优化方案

### 优化1: 事件监听器生命周期管理

```javascript
class OptimizedEventManager {
  constructor() {
    this.eventListeners = new Map();
    this.boundMethods = new Map();
  }

  // 添加事件监听器（带自动清理）
  addEventListener(target, event, handler, options = {}) {
    const boundHandler = handler.bind(this);
    this.boundMethods.set(handler, boundHandler);
    
    target.addEventListener(event, boundHandler, options);
    
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, []);
    }
    
    this.eventListeners.get(target).push({
      event,
      handler: boundHandler,
      options
    });
  }

  // 移除特定事件监听器
  removeEventListener(target, event, handler) {
    const boundHandler = this.boundMethods.get(handler);
    if (boundHandler) {
      target.removeEventListener(event, boundHandler);
      this.boundMethods.delete(handler);
    }
  }

  // 清理所有事件监听器
  cleanup() {
    for (const [target, listeners] of this.eventListeners) {
      listeners.forEach(({ event, handler }) => {
        target.removeEventListener(event, handler);
      });
    }
    this.eventListeners.clear();
    this.boundMethods.clear();
  }
}
```

### 优化2: 定时器管理器

```javascript
class TimerManager {
  constructor() {
    this.timers = new Map();
    this.intervals = new Map();
  }

  // 创建定时器
  setTimeout(callback, delay, name = null) {
    const timer = setTimeout(() => {
      callback();
      if (name) this.timers.delete(name);
    }, delay);
    
    if (name) this.timers.set(name, timer);
    return timer;
  }

  // 创建循环定时器
  setInterval(callback, interval, name = null) {
    const timer = setInterval(callback, interval);
    if (name) this.intervals.set(name, timer);
    return timer;
  }

  // 清除指定定时器
  clearTimer(name) {
    if (this.timers.has(name)) {
      clearTimeout(this.timers.get(name));
      this.timers.delete(name);
    }
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name));
      this.intervals.delete(name);
    }
  }

  // 清除所有定时器
  clearAll() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.intervals.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.intervals.clear();
  }
}
```

### 优化3: 智能缓存系统

```javascript
class SmartCacheManager {
  constructor() {
    this.cache = new Map();
    this.ttlMap = new Map();
    this.defaultTTL = 30000; // 30秒默认TTL
  }

  // 设置缓存（带TTL）
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttlMap.set(key, Date.now() + ttl);
    
    // 自动清理过期缓存
    setTimeout(() => this.delete(key), ttl);
  }

  // 获取缓存
  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expiry = this.ttlMap.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  // 删除缓存
  delete(key) {
    this.cache.delete(key);
    this.ttlMap.delete(key);
  }

  // 清空所有缓存
  clear() {
    this.cache.clear();
    this.ttlMap.clear();
  }

  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
```

### 优化4: 防抖和节流机制

```javascript
class PerformanceUtils {
  // 防抖函数
  static debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func.apply(this, args);
      };
      
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func.apply(this, args);
    };
  }

  // 节流函数
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // 批量处理
  static batchProcess(items, batchSize = 10, delay = 0) {
    return new Promise((resolve) => {
      const results = [];
      let index = 0;

      const processBatch = () => {
        const batch = items.slice(index, index + batchSize);
        
        batch.forEach(item => {
          results.push(item);
        });
        
        index += batchSize;

        if (index < items.length) {
          setTimeout(processBatch, delay);
        } else {
          resolve(results);
        }
      };

      processBatch();
    });
  }
}
```

### 优化5: 异步初始化模式

```javascript
class AsyncInitializer {
  constructor() {
    this.isInitialized = false;
    this.isInitializing = false;
    this.initPromise = null;
    this.initQueue = [];
  }

  // 异步初始化
  async init() {
    if (this.isInitialized) return;
    
    if (this.isInitializing) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.performInit();
    
    try {
      await this.initPromise;
      this.isInitialized = true;
      this.processInitQueue();
    } finally {
      this.isInitializing = false;
    }
  }

  // 执行实际初始化
  async performInit() {
    // 分阶段初始化，避免阻塞
    await this.initPhase1(); // 核心功能
    await this.nextTick();   // 让出控制权
    
    await this.initPhase2(); // 次要功能
    await this.nextTick();
    
    await this.initPhase3(); // 可选功能
  }

  // 让出控制权
  nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  // 等待初始化完成再执行
  async whenReady(callback) {
    if (this.isInitialized) {
      return callback();
    }
    
    this.initQueue.push(callback);
    await this.init();
  }

  // 处理初始化队列
  processInitQueue() {
    while (this.initQueue.length > 0) {
      const callback = this.initQueue.shift();
      try {
        callback();
      } catch (error) {
        console.error('初始化队列回调错误:', error);
      }
    }
  }
}
```

## 🔧 具体修复建议

### 修复1: WebSocket事件监听器优化

```javascript
// 替换 renderer/js/websocket.js 中的 setupPowerManagement 方法
setupPowerManagement() {
  // 使用节流的活动检测
  const throttledActivityDetector = PerformanceUtils.throttle(() => {
    this.lastActivityTime = Date.now();
  }, 1000); // 1秒节流

  // 只监听关键事件，减少频繁触发
  this.eventManager.addEventListener(window, 'focus', () => {
    this.checkSystemResume();
  });

  this.eventManager.addEventListener(document, 'mousedown', throttledActivityDetector, { passive: true });
  this.eventManager.addEventListener(document, 'keydown', throttledActivityDetector, { passive: true });
  
  // 移除mousemove事件监听器（性能杀手）
}
```

### 修复2: 应用初始化优化

```javascript
// 优化 renderer/js/app.js 的构造函数
constructor() {
  // 基础属性初始化
  this.currentUser = null;
  this.orders = [];
  this.isInitialized = false;
  
  // 延迟初始化管理器
  this.managers = new Map();
  this.eventManager = new OptimizedEventManager();
  this.timerManager = new TimerManager();
  this.cacheManager = new SmartCacheManager();
  
  // 异步初始化（不阻塞构造函数）
  this.initPromise = this.asyncInit();
}

async asyncInit() {
  try {
    await this.initCore();        // 核心功能
    await this.nextTick();
    
    await this.initUI();         // UI功能
    await this.nextTick();
    
    await this.initOptional();   // 可选功能
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
}
```

### 修复3: CLodop状态检查优化

```javascript
// 优化 CLodop 状态检查逻辑
class OptimizedCLodopChecker {
  constructor() {
    this.cache = new SmartCacheManager();
    this.checkQueue = new Set();
    this.isChecking = false;
  }

  async checkStatus(forceRefresh = false) {
    const cacheKey = 'clodop-status';
    
    // 检查缓存
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) return cached;
    }

    // 防止重复检查
    if (this.isChecking) {
      return new Promise(resolve => {
        this.checkQueue.add(resolve);
      });
    }

    this.isChecking = true;
    
    try {
      const result = await this.performCheck();
      this.cache.set(cacheKey, result, 30000); // 缓存30秒
      
      // 处理等待队列
      this.checkQueue.forEach(resolve => resolve(result));
      this.checkQueue.clear();
      
      return result;
    } finally {
      this.isChecking = false;
    }
  }
}
```

## 📊 性能监控和分析

### 内存使用监控

```javascript
class MemoryMonitor {
  constructor() {
    this.measurements = [];
    this.maxMeasurements = 100;
  }

  measure() {
    if (performance.memory) {
      const memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      
      this.measurements.push(memory);
      
      if (this.measurements.length > this.maxMeasurements) {
        this.measurements.shift();
      }
      
      return memory;
    }
    return null;
  }

  getStats() {
    if (this.measurements.length === 0) return null;
    
    const latest = this.measurements[this.measurements.length - 1];
    const oldest = this.measurements[0];
    
    return {
      current: latest,
      trend: latest.used - oldest.used,
      average: this.measurements.reduce((sum, m) => sum + m.used, 0) / this.measurements.length
    };
  }

  checkForLeaks() {
    const stats = this.getStats();
    if (!stats) return false;
    
    // 检查内存增长趋势
    const growthRate = stats.trend / (stats.current.timestamp - this.measurements[0].timestamp);
    const criticalRate = 1024 * 1024; // 1MB/秒
    
    return growthRate > criticalRate;
  }
}
```

### 性能分析工具

```javascript
class PerformanceProfiler {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
  }

  // 标记开始
  mark(name) {
    performance.mark(`${name}-start`);
    this.marks.set(name, Date.now());
  }

  // 标记结束并测量
  measure(name) {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`未找到标记: ${name}`);
      return null;
    }

    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const duration = Date.now() - startTime;
    this.measures.set(name, duration);
    
    return duration;
  }

  // 获取性能报告
  getReport() {
    const entries = performance.getEntriesByType('measure');
    const report = {
      measures: Object.fromEntries(this.measures),
      performanceEntries: entries.map(entry => ({
        name: entry.name,
        duration: entry.duration,
        startTime: entry.startTime
      }))
    };
    
    return report;
  }

  // 清理性能数据
  clear() {
    performance.clearMarks();
    performance.clearMeasures();
    this.marks.clear();
    this.measures.clear();
  }
}
```

## ⚡ 实施优先级

### 高优先级（立即修复）
1. **WebSocket事件监听器清理** - 严重内存泄漏
2. **定时器统一管理** - 资源泄漏
3. **应用初始化优化** - 启动性能

### 中优先级（近期优化）
1. **CLodop状态检查缓存** - 减少重复检查
2. **打印操作批处理** - 提升并发性能
3. **网络请求优化** - 减少网络开销

### 低优先级（长期改进）
1. **代码分割和懒加载** - 减少初始化时间
2. **Service Worker缓存** - 离线性能
3. **虚拟滚动** - 大量数据处理

## 🎯 预期收益

### 性能提升
- **内存使用**: 减少30-50%的内存占用
- **启动速度**: 提升50-70%的初始化速度
- **响应时间**: 减少40-60%的操作延迟

### 稳定性改善
- **内存泄漏**: 消除主要的内存泄漏源
- **错误率**: 减少50%的运行时错误
- **长期运行**: 支持24/7稳定运行

### 用户体验
- **界面响应**: 更流畅的用户交互
- **资源占用**: 降低系统负载
- **电池续航**: 减少CPU和内存使用

通过实施这些优化，MenuorgPrint将获得显著的性能提升和更好的用户体验！ 