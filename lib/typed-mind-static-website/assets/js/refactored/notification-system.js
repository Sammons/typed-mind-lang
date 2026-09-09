// NotificationSystem - Centralized message management with enhanced UX
class NotificationSystem extends BaseUIComponent {
  constructor(config = {}) {
    super(null, config);
    
    this.notifications = new Map();
    this.notificationId = 0;
    this.container = null;
    
    this.createContainer();
    this.initialize();
  }

  getDefaultConfig() {
    return {
      position: 'top-right', // top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
      autoRemoveDelay: 5000,
      maxNotifications: 5,
      containerClass: 'notification-container',
      notificationClass: 'notification',
      animationDuration: 300
    };
  }

  /**
   * Create the notification container
   */
  createContainer() {
    this.container = this.createElement('div', {
      className: `${this.getConfig('containerClass')} ${this.getConfig('position')}`,
      id: 'notification-container'
    });
    
    // Add CSS styles if not already present
    this.addStyles();
    
    document.body.appendChild(this.container);
    this.element = this.container;
  }

  /**
   * Add CSS styles for notifications
   */
  addStyles() {
    if (document.getElementById('notification-styles')) {
      return;
    }
    
    const styles = this.createElement('style', { id: 'notification-styles' }, `
      .notification-container {
        position: fixed;
        z-index: 10000;
        pointer-events: none;
        max-width: 400px;
        width: 100%;
      }
      
      .notification-container.top-right {
        top: 20px;
        right: 20px;
      }
      
      .notification-container.top-left {
        top: 20px;
        left: 20px;
      }
      
      .notification-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      .notification-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      .notification-container.top-center {
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .notification-container.bottom-center {
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
      }
      
      .notification {
        background: white;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-left: 4px solid #ccc;
        pointer-events: auto;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        overflow: hidden;
      }
      
      .notification.show {
        opacity: 1;
        transform: translateX(0);
      }
      
      .notification.success {
        border-left-color: #4CAF50;
        background: #f8fff8;
      }
      
      .notification.error {
        border-left-color: #f44336;
        background: #fff8f8;
      }
      
      .notification.warning {
        border-left-color: #ff9800;
        background: #fffbf0;
      }
      
      .notification.info {
        border-left-color: #2196F3;
        background: #f0f8ff;
      }
      
      .notification-content {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      
      .notification-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      
      .notification-text {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
        color: #333;
      }
      
      .notification-title {
        font-weight: bold;
        margin-bottom: 4px;
        color: #222;
      }
      
      .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        color: #999;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .notification-close:hover {
        background: rgba(0, 0, 0, 0.1);
        color: #666;
      }
      
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.7);
        transition: width linear;
      }
      
      .notification.success .notification-progress {
        background: #4CAF50;
      }
      
      .notification.error .notification-progress {
        background: #f44336;
      }
      
      .notification.warning .notification-progress {
        background: #ff9800;
      }
      
      .notification.info .notification-progress {
        background: #2196F3;
      }
    `);
    
    document.head.appendChild(styles);
  }

  /**
   * Show a notification
   */
  showNotification(message, type = 'info', options = {}) {
    const id = ++this.notificationId;
    const config = { ...options };
    
    // Remove oldest notification if at max
    if (this.notifications.size >= this.getConfig('maxNotifications')) {
      const oldestId = this.notifications.keys().next().value;
      this.removeNotification(oldestId);
    }
    
    const notification = this.createNotificationElement(id, message, type, config);
    this.notifications.set(id, {
      element: notification,
      type,
      message,
      config,
      timestamp: Date.now()
    });
    
    this.container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto-remove if enabled
    const autoRemoveDelay = config.autoRemove !== false ? 
      (config.duration || this.getConfig('autoRemoveDelay')) : 0;
    
    if (autoRemoveDelay > 0) {
      this.scheduleRemoval(id, autoRemoveDelay);
    }
    
    this.emit('notificationShown', { id, message, type, config });
    return id;
  }

  /**
   * Create notification DOM element
   */
  createNotificationElement(id, message, type, config) {
    const icons = {
      success: LucideIcons.check,
      error: LucideIcons.xCircle,
      warning: LucideIcons.alertTriangle,
      info: LucideIcons.info
    };
    
    const notification = this.createElement('div', {
      className: `${this.getConfig('notificationClass')} ${type}`,
      'data-id': id
    });
    
    const content = this.createElement('div', { className: 'notification-content' });
    
    // Icon
    const icon = this.createElement('div', {
      className: 'notification-icon',
      innerHTML: icons[type] || icons.info
    });
    content.appendChild(icon);
    
    // Text content
    const textDiv = this.createElement('div', { className: 'notification-text' });
    
    if (config.title) {
      const titleDiv = this.createElement('div', { 
        className: 'notification-title',
        textContent: config.title
      });
      textDiv.appendChild(titleDiv);
    }
    
    const messageDiv = this.createElement('div', {
      innerHTML: this.escapeHtml(message).replace(/\n/g, '<br>')
    });
    textDiv.appendChild(messageDiv);
    
    content.appendChild(textDiv);
    notification.appendChild(content);
    
    // Close button
    const closeBtn = this.createElement('button', {
      className: 'notification-close',
      innerHTML: '×',
      'aria-label': 'Close notification'
    });
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeNotification(id);
    });
    
    notification.appendChild(closeBtn);
    
    // Progress bar for auto-removal
    if (config.autoRemove !== false) {
      const progressBar = this.createElement('div', { className: 'notification-progress' });
      notification.appendChild(progressBar);
    }
    
    // Click to dismiss (unless disabled)
    if (config.clickToDismiss !== false) {
      notification.addEventListener('click', () => {
        this.removeNotification(id);
      });
    }
    
    return notification;
  }

  /**
   * Schedule notification removal
   */
  scheduleRemoval(id, delay) {
    const notification = this.notifications.get(id);
    if (!notification) return;
    
    const progressBar = notification.element.querySelector('.notification-progress');
    if (progressBar) {
      progressBar.style.width = '100%';
      progressBar.style.transitionDuration = `${delay}ms`;
      
      setTimeout(() => {
        if (progressBar.parentNode) {
          progressBar.style.width = '0%';
        }
      }, 50);
    }
    
    setTimeout(() => {
      this.removeNotification(id);
    }, delay);
  }

  /**
   * Remove a notification
   */
  removeNotification(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;
    
    const element = notification.element;
    element.classList.remove('show');
    
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
      this.emit('notificationRemoved', { id, ...notification });
    }, this.getConfig('animationDuration'));
  }

  /**
   * Remove all notifications
   */
  clearNotifications() {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.removeNotification(id));
  }

  /**
   * Show success message
   */
  showSuccess(message, options = {}) {
    return this.showNotification(message, 'success', options);
  }

  /**
   * Show error message
   */
  showError(message, options = {}) {
    return this.showNotification(message, 'error', { 
      autoRemove: false,
      ...options 
    });
  }

  /**
   * Show warning message
   */
  showWarning(message, options = {}) {
    return this.showNotification(message, 'warning', options);
  }

  /**
   * Show info message
   */
  showInfo(message, options = {}) {
    return this.showNotification(message, 'info', options);
  }

  /**
   * Show progress notification
   */
  showProgress(message, options = {}) {
    return this.showNotification(message, 'info', {
      autoRemove: false,
      clickToDismiss: false,
      ...options
    });
  }

  /**
   * Update an existing notification
   */
  updateNotification(id, message, type = null) {
    const notification = this.notifications.get(id);
    if (!notification) return false;
    
    const textDiv = notification.element.querySelector('.notification-text');
    const messageDiv = textDiv.lastElementChild;
    
    if (messageDiv) {
      messageDiv.innerHTML = this.escapeHtml(message).replace(/\n/g, '<br>');
    }
    
    if (type && type !== notification.type) {
      notification.element.className = notification.element.className.replace(notification.type, type);
      notification.type = type;
    }
    
    notification.message = message;
    this.emit('notificationUpdated', { id, message, type });
    return true;
  }

  /**
   * Get notification count by type
   */
  getNotificationCount(type = null) {
    if (!type) {
      return this.notifications.size;
    }
    
    return Array.from(this.notifications.values())
      .filter(notification => notification.type === type).length;
  }

  /**
   * Clean up and destroy the notification system
   */
  destroy() {
    this.clearNotifications();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    const styles = document.getElementById('notification-styles');
    if (styles && styles.parentNode) {
      styles.parentNode.removeChild(styles);
    }
    
    super.destroy();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.NotificationSystem = NotificationSystem;
}