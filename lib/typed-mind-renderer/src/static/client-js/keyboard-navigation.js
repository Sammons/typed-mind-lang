    // ============= KEYBOARD NAVIGATION =============
    setupKeyboardNavigation() {
      if (!this.options.enableKeyboardNavigation) return;

      document.addEventListener('keydown', (event) => this.handleGlobalKeyboard(event));

      // Make nodes focusable for keyboard navigation
      this.svg?.selectAll('.node')
        .attr('tabindex', 0)
        .on('keydown', (event, d) => this.handleNodeKeyboard(event, d));
    }

    handleGlobalKeyboard(event) {
      // Global keyboard shortcuts
      const isCtrlCmd = event.ctrlKey || event.metaKey;

      switch (event.key) {
        case 'Escape':
          this.clearSelection();
          this.hideContextMenu();
          break;

        case 'f':
        case 'F':
          if (isCtrlCmd) {
            event.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.focus();
          }
          break;

        case 'a':
        case 'A':
          if (isCtrlCmd) {
            event.preventDefault();
            this.selectAllVisible();
          }
          break;

        case 'z':
        case 'Z':
          if (isCtrlCmd) {
            event.preventDefault();
            if (event.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
          }
          break;

        case '=':
        case '+':
          if (isCtrlCmd) {
            event.preventDefault();
            this.zoomIn();
          }
          break;

        case '-':
          if (isCtrlCmd) {
            event.preventDefault();
            this.zoomOut();
          }
          break;

        case '0':
          if (isCtrlCmd) {
            event.preventDefault();
            this.zoomToFit();
          }
          break;

        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight':
          this.handleArrowNavigation(event);
          break;
      }
    }

    handleNodeKeyboard(event, node) {
      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          this.selectEntity(node.id);
          break;

        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          this.hideEntity(node.id);
          break;

        case 'f':
        case 'F':
          if (!(event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.focusOnEntity(node.id);
          }
          break;

        case 't':
        case 'T':
          event.preventDefault();
          this.enableRelationshipTracing(node.id);
          break;
      }
    }

    handleArrowNavigation(event) {
      if (!this.currentViewState.focusedEntity) return;

      const currentNode = this.data.entities.find(e => e.name === this.currentViewState.focusedEntity);
      if (!currentNode) return;

      // Find adjacent nodes based on relationships
      const candidates = [];

      // Get connected nodes
      const links = this.data.links.filter(l =>
        l.source === currentNode.name || l.target === currentNode.name
      );

      links.forEach(link => {
        const otherEntity = link.source === currentNode.name ? link.target : link.source;
        const entity = this.data.entities.find(e => e.name === otherEntity);
        if (entity && !this.currentViewState.hiddenEntities.has(entity.name)) {
          candidates.push(entity);
        }
      });

      if (candidates.length > 0) {
        event.preventDefault();
        // Simple navigation - cycle through connected nodes
        const currentIndex = candidates.findIndex(c => c.name === this.currentViewState.focusedEntity);
        let nextIndex;

        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowDown':
            nextIndex = (currentIndex + 1) % candidates.length;
            break;
          case 'ArrowLeft':
          case 'ArrowUp':
            nextIndex = (currentIndex - 1 + candidates.length) % candidates.length;
            break;
          default:
            return;
        }

        this.selectEntity(candidates[nextIndex].name);
      }
    }

    selectAllVisible() {
      this.currentViewState.selectedEntities.clear();
      this.data.entities.forEach(entity => {
        if (!this.currentViewState.hiddenEntities.has(entity.name) &&
            this.currentViewState.filters.get(entity.type)) {
          this.currentViewState.selectedEntities.add(entity.name);
        }
      });

      this.updateSelectionDisplay();
      this.saveViewState();
    }
