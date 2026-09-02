    // ============= PERFORMANCE MONITORING =============
    startPerformanceMonitoring() {
      if (!this.options.enablePerformanceMonitoring) return;

      this.performanceMetrics.set('startTime', performance.now());
      this.performanceMetrics.set('frameCount', 0);
      this.performanceMetrics.set('lastFrameTime', performance.now());

      // Monitor FPS
      this.monitorFPS();

      // Monitor memory usage (if available)
      this.monitorMemory();

      // Add performance info button handler
      document.getElementById('performance-info')?.addEventListener('click', () => {
        this.showPerformancePanel();
      });
    }

    monitorFPS() {
      const updateFPS = () => {
        const now = performance.now();
        const frameCount = this.performanceMetrics.get('frameCount') + 1;
        this.performanceMetrics.set('frameCount', frameCount);

        const lastFrameTime = this.performanceMetrics.get('lastFrameTime');
        if (now - lastFrameTime >= 1000) { // Update every second
          this.fps = Math.round(frameCount * 1000 / (now - lastFrameTime));
          this.performanceMetrics.set('frameCount', 0);
          this.performanceMetrics.set('lastFrameTime', now);

          // Update performance display if visible
          const fpsDisplay = document.getElementById('fps-display');
          if (fpsDisplay) {
            fpsDisplay.textContent = `${this.fps} FPS`;
          }
        }

        requestAnimationFrame(updateFPS);
      };

      requestAnimationFrame(updateFPS);
    }

    monitorMemory() {
      if (!window.performance?.memory) return;

      setInterval(() => {
        const memory = window.performance.memory;
        this.performanceMetrics.set('memoryUsed', Math.round(memory.usedJSHeapSize / 1048576)); // MB
        this.performanceMetrics.set('memoryTotal', Math.round(memory.totalJSHeapSize / 1048576)); // MB
      }, 5000);
    }

    showPerformancePanel() {
      const panel = document.createElement('div');
      panel.className = 'performance-panel';
      panel.innerHTML = `
        <div class="performance-panel-overlay"></div>
        <div class="performance-panel-content">
          <div class="performance-panel-header">
            <h3>📊 Performance Metrics</h3>
            <button class="performance-panel-close">×</button>
          </div>
          <div class="performance-panel-body">
            <div class="performance-metric">
              <div class="performance-metric-label">Frame Rate:</div>
              <div class="performance-metric-value" id="fps-display">${this.fps} FPS</div>
            </div>
            <div class="performance-metric">
              <div class="performance-metric-label">Entities:</div>
              <div class="performance-metric-value">${this.data.entities.length}</div>
            </div>
            <div class="performance-metric">
              <div class="performance-metric-label">Links:</div>
              <div class="performance-metric-value">${this.data.links.length}</div>
            </div>
            <div class="performance-metric">
              <div class="performance-metric-label">Selected:</div>
              <div class="performance-metric-value">${this.currentViewState.selectedEntities.size}</div>
            </div>
            <div class="performance-metric">
              <div class="performance-metric-label">Visible:</div>
              <div class="performance-metric-value">${this.data.entities.length - this.currentViewState.hiddenEntities.size}</div>
            </div>
            ${this.performanceMetrics.has('memoryUsed') ? `
            <div class="performance-metric">
              <div class="performance-metric-label">Memory:</div>
              <div class="performance-metric-value">${this.performanceMetrics.get('memoryUsed')} MB</div>
            </div>
            ` : ''}
            <div class="performance-metric">
              <div class="performance-metric-label">Uptime:</div>
              <div class="performance-metric-value">${this.getUptime()}</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(panel);

      const closeDialog = () => panel.remove();

      panel.querySelector('.performance-panel-close')?.addEventListener('click', closeDialog);
      panel.querySelector('.performance-panel-overlay')?.addEventListener('click', closeDialog);
    }

    getUptime() {
      const startTime = this.performanceMetrics.get('startTime') || performance.now();
      const uptime = (performance.now() - startTime) / 1000;

      if (uptime < 60) {
        return `${Math.round(uptime)}s`;
      } else if (uptime < 3600) {
        return `${Math.round(uptime / 60)}m`;
      } else {
        return `${Math.round(uptime / 3600)}h`;
      }
    }
