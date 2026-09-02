    // ============= NOTIFICATION SYSTEM =============
    setupNotificationSystem() {
      this.notificationContainer = document.createElement('div');
      this.notificationContainer.id = 'notification-container';
      this.notificationContainer.className = 'notification-container';
      document.body.appendChild(this.notificationContainer);
    }

    showNotification(message, type = 'info', duration = 3000) {
      if (!this.notificationContainer) {
        this.setupNotificationSystem();
      }

      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;

      const icon = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
      }[type] || 'ℹ️';

      notification.innerHTML = `
        <div class="notification-icon">${icon}</div>
        <div class="notification-message">${message}</div>
        <button class="notification-close">×</button>
      `;

      this.notificationContainer.appendChild(notification);

      // Auto remove
      const autoRemove = setTimeout(() => {
        if (notification.parentNode) {
          this.removeNotification(notification);
        }
      }, duration);

      // Manual close
      notification.querySelector('.notification-close')?.addEventListener('click', () => {
        clearTimeout(autoRemove);
        this.removeNotification(notification);
      });

      // Animate in
      requestAnimationFrame(() => {
        notification.classList.add('notification-show');
      });
    }

    removeNotification(notification) {
      notification.classList.add('notification-hide');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }

    showLoadingOverlay() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
      }
    }

    hideLoadingOverlay() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
    }
