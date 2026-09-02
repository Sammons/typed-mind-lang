    // ============= CONTEXTUAL RIGHT-CLICK MENUS =============
    setupContextMenus() {
      // Remove any existing context menu on outside click
      document.addEventListener('click', () => this.hideContextMenu());

      // Node right-click
      this.svg?.selectAll('.node').on('contextmenu', (event, d) => {
        event.preventDefault();
        this.showNodeContextMenu(event, d);
      });

      // Canvas right-click
      this.svg?.on('contextmenu', (event) => {
        event.preventDefault();
        if (event.target === event.currentTarget) {
          this.showCanvasContextMenu(event);
        }
      });
    }

    showNodeContextMenu(event, node) {
      this.hideContextMenu();

      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="context-menu-item" data-action="focus">🎯 Focus on Entity</div>
        <div class="context-menu-item" data-action="hide">👁️ Hide Entity</div>
        <div class="context-menu-item" data-action="trace">🔗 Trace Relationships</div>
        <div class="context-menu-item" data-action="compare">📊 Compare Similar</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="bookmark">🔖 Bookmark View</div>
        <div class="context-menu-item" data-action="export-node">📤 Export Entity</div>
      `;

      // Position menu
      menu.style.position = 'fixed';
      menu.style.left = event.pageX + 'px';
      menu.style.top = event.pageY + 'px';
      menu.style.zIndex = '1000';

      // Add event listeners
      menu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const action = e.target.dataset.action;
          this.handleContextAction(action, node);
          this.hideContextMenu();
        });
      });

      document.body.appendChild(menu);
      this.contextMenu = menu;
    }

    showCanvasContextMenu(event) {
      this.hideContextMenu();

      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.innerHTML = `
        <div class="context-menu-item" data-action="clear-selection">❌ Clear Selection</div>
        <div class="context-menu-item" data-action="show-all">👁️ Show All Entities</div>
        <div class="context-menu-item" data-action="reset-zoom">🔍 Reset Zoom</div>
        <div class="context-menu-separator"></div>
        <div class="context-menu-item" data-action="save-bookmark">💾 Save Current View</div>
        <div class="context-menu-item" data-action="export-all">📊 Export Everything</div>
      `;

      menu.style.position = 'fixed';
      menu.style.left = event.pageX + 'px';
      menu.style.top = event.pageY + 'px';
      menu.style.zIndex = '1000';

      menu.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const action = e.target.dataset.action;
          this.handleContextAction(action, null);
          this.hideContextMenu();
        });
      });

      document.body.appendChild(menu);
      this.contextMenu = menu;
    }

    handleContextAction(action, entity) {
      switch (action) {
        case 'focus':
          this.focusOnEntity(entity.id);
          break;
        case 'hide':
          this.hideEntity(entity.id);
          break;
        case 'trace':
          this.enableRelationshipTracing(entity.id);
          break;
        case 'compare':
          this.startEntityComparison(entity);
          break;
        case 'bookmark':
          this.createBookmark(`Focus: ${entity.name}`);
          break;
        case 'export-node':
          this.exportEntity(entity);
          break;
        case 'clear-selection':
          this.clearSelection();
          break;
        case 'show-all':
          this.showAllEntities();
          break;
        case 'reset-zoom':
          this.zoomToFit();
          break;
        case 'save-bookmark':
          this.createBookmark('Custom View');
          break;
        case 'export-all':
          this.exportVisualization();
          break;
      }
    }

    hideContextMenu() {
      if (this.contextMenu) {
        this.contextMenu.remove();
        this.contextMenu = null;
      }
    }
