    // ============= VIEW HISTORY AND BOOKMARKS =============
    setupViewHistory() {
      this.addBookmarkControls();
    }

    addBookmarkControls() {
      const controlsPanel = document.querySelector('.controls-panel');
      if (!controlsPanel) return;

      const bookmarkGroup = document.createElement('div');
      bookmarkGroup.className = 'control-group';
      bookmarkGroup.innerHTML = `
        <div class="control-label">Bookmarks</div>
        <div class="bookmark-controls">
          <button class="bookmark-btn" id="save-bookmark" title="Save Current View">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17,3H7A2,2 0 0,0 5,5V21L12,18L19,21V5C19,3.89 18.1,3 17,3Z"/>
            </svg>
            Save View
          </button>
          <select id="bookmark-list" class="bookmark-select">
            <option value="">Saved Views...</option>
          </select>
        </div>
      `;

      controlsPanel.appendChild(bookmarkGroup);

      // Event handlers
      document.getElementById('save-bookmark')?.addEventListener('click', () => {
        this.showBookmarkDialog();
      });

      document.getElementById('bookmark-list')?.addEventListener('change', (e) => {
        if (e.target.value) {
          this.restoreBookmark(e.target.value);
          e.target.value = ''; // Reset selection
        }
      });
    }

    showBookmarkDialog() {
      const dialog = document.createElement('div');
      dialog.className = 'bookmark-dialog';
      dialog.innerHTML = `
        <div class="bookmark-dialog-overlay"></div>
        <div class="bookmark-dialog-content">
          <div class="bookmark-dialog-header">
            <h3>Save Current View</h3>
            <button class="bookmark-dialog-close">×</button>
          </div>
          <div class="bookmark-dialog-body">
            <input type="text" id="bookmark-name" placeholder="Enter bookmark name..." value="View ${this.bookmarks.size + 1}">
            <textarea id="bookmark-description" placeholder="Optional description..."></textarea>
          </div>
          <div class="bookmark-dialog-footer">
            <button id="bookmark-cancel" class="bookmark-btn bookmark-btn-secondary">Cancel</button>
            <button id="bookmark-save" class="bookmark-btn bookmark-btn-primary">Save</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const closeDialog = () => dialog.remove();

      dialog.querySelector('.bookmark-dialog-close')?.addEventListener('click', closeDialog);
      dialog.querySelector('.bookmark-dialog-overlay')?.addEventListener('click', closeDialog);
      dialog.querySelector('#bookmark-cancel')?.addEventListener('click', closeDialog);

      dialog.querySelector('#bookmark-save')?.addEventListener('click', () => {
        const name = document.getElementById('bookmark-name')?.value.trim();
        const description = document.getElementById('bookmark-description')?.value.trim();

        if (name) {
          this.saveBookmark(name, description);
          closeDialog();
        }
      });

      // Focus the name input
      setTimeout(() => {
        const nameInput = document.getElementById('bookmark-name');
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 100);
    }

    saveBookmark(name, description = '') {
      const bookmark = {
        ...this.cloneViewState(),
        metadata: {
          name,
          description,
          created: new Date().toISOString(),
          entityCount: this.data.entities.length,
          selectedCount: this.currentViewState.selectedEntities.size
        }
      };

      this.bookmarks.set(name, bookmark);
      this.updateBookmarkList();
      this.showNotification(`Saved bookmark: ${name}`, 'success');

      // Persist bookmarks to localStorage
      try {
        const bookmarkData = Array.from(this.bookmarks.entries()).map(([key, value]) => ({
          name: key,
          ...value,
          selectedEntities: Array.from(value.selectedEntities),
          hiddenEntities: Array.from(value.hiddenEntities),
          filters: Array.from(value.filters.entries())
        }));
        localStorage.setItem('typedmind-bookmarks', JSON.stringify(bookmarkData));
      } catch (_error) {
        console.warn('Failed to persist bookmarks:', error);
      }
    }

    loadBookmarks() {
      try {
        const savedBookmarks = localStorage.getItem('typedmind-bookmarks');
        if (savedBookmarks) {
          const bookmarkData = JSON.parse(savedBookmarks);
          bookmarkData.forEach(bookmark => {
            const restored = {
              ...bookmark,
              selectedEntities: new Set(bookmark.selectedEntities),
              hiddenEntities: new Set(bookmark.hiddenEntities),
              filters: new Map(bookmark.filters)
            };
            delete restored.name;
            this.bookmarks.set(bookmark.name, restored);
          });
          this.updateBookmarkList();
        }
      } catch (_error) {
        console.warn('Failed to load bookmarks:', error);
      }
    }

    updateBookmarkList() {
      const bookmarkList = document.getElementById('bookmark-list');
      if (!bookmarkList) return;

      // Clear existing options (except first)
      while (bookmarkList.children.length > 1) {
        bookmarkList.removeChild(bookmarkList.lastChild);
      }

      // Add bookmark options
      Array.from(this.bookmarks.keys()).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        bookmarkList.appendChild(option);
      });
    }

    restoreBookmark(name) {
      const bookmark = this.bookmarks.get(name);
      if (!bookmark) return;

      this.restoreViewState(bookmark);
      this.showNotification(`Restored bookmark: ${name}`, 'success');
    }

    createBookmark(name) {
      this.saveBookmark(name);
    }
