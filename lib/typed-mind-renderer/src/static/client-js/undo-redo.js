    // ============= UNDO/REDO FUNCTIONALITY =============
    saveViewState() {
      const state = this.cloneViewState();

      // Add to undo stack
      this.undoStack.push(state);

      // Limit undo stack size
      if (this.undoStack.length > 50) {
        this.undoStack.shift();
      }

      // Clear redo stack on new action
      this.redoStack = [];

      // Update UI buttons
      this.updateUndoRedoButtons();
    }

    undo() {
      if (this.undoStack.length <= 1) return;

      // Move current state to redo stack
      const currentState = this.undoStack.pop();
      if (currentState) {
        this.redoStack.push(currentState);
      }

      // Restore previous state
      const previousState = this.undoStack[this.undoStack.length - 1];
      if (previousState) {
        this.restoreViewState(previousState);
      }

      this.updateUndoRedoButtons();
    }

    redo() {
      if (this.redoStack.length === 0) return;

      const stateToRestore = this.redoStack.pop();
      if (stateToRestore) {
        this.undoStack.push(stateToRestore);
        this.restoreViewState(stateToRestore);
      }

      this.updateUndoRedoButtons();
    }

    cloneViewState() {
      return {
        selectedEntities: new Set(this.currentViewState.selectedEntities),
        focusedEntity: this.currentViewState.focusedEntity,
        hiddenEntities: new Set(this.currentViewState.hiddenEntities),
        filters: new Map(this.currentViewState.filters),
        zoomLevel: this.currentViewState.zoomLevel,
        panPosition: { ...this.currentViewState.panPosition },
        layoutType: this.currentViewState.layoutType,
        searchQuery: this.currentViewState.searchQuery
      };
    }

    restoreViewState(state) {
      this.currentViewState = {
        selectedEntities: new Set(state.selectedEntities),
        focusedEntity: state.focusedEntity,
        hiddenEntities: new Set(state.hiddenEntities),
        filters: new Map(state.filters),
        zoomLevel: state.zoomLevel,
        panPosition: { ...state.panPosition },
        layoutType: state.layoutType,
        searchQuery: state.searchQuery
      };

      // Update UI to reflect restored state
      this.updateSelectionDisplay();
      this.updateFilterCheckboxes();
      this.renderEntityList();
      this.updateSearchInput();

      if (state.focusedEntity) {
        this.focusOnEntity(state.focusedEntity);
      }
    }

    updateUndoRedoButtons() {
      // Add undo/redo buttons if they don't exist
      this.ensureUndoRedoButtons();

      const undoBtn = document.getElementById('undo-btn');
      const redoBtn = document.getElementById('redo-btn');

      if (undoBtn) {
        undoBtn.disabled = this.undoStack.length <= 1;
        undoBtn.style.opacity = undoBtn.disabled ? '0.5' : '1';
      }

      if (redoBtn) {
        redoBtn.disabled = this.redoStack.length === 0;
        redoBtn.style.opacity = redoBtn.disabled ? '0.5' : '1';
      }
    }

    ensureUndoRedoButtons() {
      if (document.getElementById('undo-btn')) return;

      const toolbar = document.querySelector('.toolbar');
      if (!toolbar) return;

      const undoRedoGroup = document.createElement('div');
      undoRedoGroup.className = 'toolbar-group';
      undoRedoGroup.innerHTML = `
        <div class="toolbar-btn" id="undo-btn" title="Undo (Ctrl+Z)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.5,8C9.85,8 7.45,9 5.6,10.6L2,7V16H11L7.38,12.38C8.77,11.22 10.54,10.5 12.5,10.5C16.04,10.5 19.05,12.81 20.1,16.07L22.47,15.24C21.08,11.03 17.15,8 12.5,8Z"/>
          </svg>
          Undo
        </div>
        <div class="toolbar-btn" id="redo-btn" title="Redo (Ctrl+Shift+Z)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.4,10.6C16.55,9 14.15,8 11.5,8C6.85,8 2.92,11.03 1.53,15.24L3.9,16.07C4.95,12.81 7.96,10.5 11.5,10.5C13.46,10.5 15.23,11.22 16.62,12.38L13,16H22V7L18.4,10.6Z"/>
          </svg>
          Redo
        </div>
      `;

      toolbar.appendChild(undoRedoGroup);

      // Add event listeners
      document.getElementById('undo-btn')?.addEventListener('click', () => this.undo());
      document.getElementById('redo-btn')?.addEventListener('click', () => this.redo());
    }
