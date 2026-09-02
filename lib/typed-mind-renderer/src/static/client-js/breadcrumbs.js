    // ============= BREADCRUMB NAVIGATION =============
    setupBreadcrumbNavigation() {
      const breadcrumbContainer = document.createElement('div');
      breadcrumbContainer.id = 'breadcrumb-navigation';
      breadcrumbContainer.className = 'breadcrumb-container';
      breadcrumbContainer.innerHTML = `
        <div class="breadcrumb-title">Navigation Path</div>
        <div class="breadcrumb-items" id="breadcrumb-items">
          <div class="breadcrumb-item active" data-state="initial">🏠 Overview</div>
        </div>
        <div class="breadcrumb-actions">
          <button id="breadcrumb-back" class="breadcrumb-btn" title="Go Back">←</button>
          <button id="breadcrumb-forward" class="breadcrumb-btn" title="Go Forward">→</button>
          <button id="breadcrumb-clear" class="breadcrumb-btn" title="Clear Path">✕</button>
        </div>
      `;

      // Insert into sidebar
      const sidebar = document.getElementById('sidebar');
      const controlsPanel = sidebar?.querySelector('.controls-panel');
      if (controlsPanel) {
        controlsPanel.appendChild(breadcrumbContainer);
      }

      // Setup breadcrumb events
      document.getElementById('breadcrumb-back')?.addEventListener('click', () => this.navigateBack());
      document.getElementById('breadcrumb-forward')?.addEventListener('click', () => this.navigateForward());
      document.getElementById('breadcrumb-clear')?.addEventListener('click', () => this.clearBreadcrumbs());
    }

    updateBreadcrumbs(action, entity = null) {
      const breadcrumbItems = document.getElementById('breadcrumb-items');
      if (!breadcrumbItems) return;

      const breadcrumbItem = document.createElement('div');
      breadcrumbItem.className = 'breadcrumb-item active';

      let breadcrumbText = '';
      const stateData = { action, timestamp: Date.now() };

      switch (action) {
        case 'focus':
          breadcrumbText = `🎯 ${entity}`;
          stateData.entity = entity;
          break;
        case 'search':
          breadcrumbText = `🔍 "${entity}"`;
          stateData.query = entity;
          break;
        case 'filter':
          breadcrumbText = `📁 Filtered`;
          stateData.filters = Array.from(this.currentViewState.filters.entries());
          break;
        case 'layout':
          breadcrumbText = `📊 ${entity} Layout`;
          stateData.layout = entity;
          break;
        default:
          return;
      }

      breadcrumbItem.textContent = breadcrumbText;
      breadcrumbItem.dataset.state = JSON.stringify(stateData);
      breadcrumbItem.addEventListener('click', () => this.restoreBreadcrumbState(stateData));

      // Remove 'active' from other items
      breadcrumbItems.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.classList.remove('active');
      });

      breadcrumbItems.appendChild(breadcrumbItem);

      // Limit breadcrumb history
      const items = breadcrumbItems.querySelectorAll('.breadcrumb-item');
      if (items.length > 10) {
        items[1].remove(); // Keep initial item
      }
    }

    restoreBreadcrumbState(stateData) {
      switch (stateData.action) {
        case 'focus':
          this.focusOnEntity(stateData.entity);
          break;
        case 'search': {
          this.handleSearch(stateData.query);
          const searchInput = document.getElementById('search-input');
          if (searchInput) searchInput.value = stateData.query;
          break;
        }
        case 'filter':
          this.currentViewState.filters.clear();
          stateData.filters.forEach(([key, value]) => {
            this.currentViewState.filters.set(key, value);
          });
          this.updateFilterCheckboxes();
          this.renderEntityList();
          break;
        case 'layout':
          this.switchLayout(stateData.layout);
          break;
      }
    }

    navigateBack() {
      if (this.undoStack.length > 1) {
        this.undo();
      }
    }

    navigateForward() {
      if (this.redoStack.length > 0) {
        this.redo();
      }
    }

    clearBreadcrumbs() {
      const breadcrumbItems = document.getElementById('breadcrumb-items');
      if (breadcrumbItems) {
        breadcrumbItems.innerHTML = '<div class="breadcrumb-item active" data-state="initial">🏠 Overview</div>';
      }
    }
