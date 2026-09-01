    // ============= ACCESSIBILITY FEATURES =============
    setupAccessibility() {
      if (!this.options.enableAccessibility) return;

      // Add ARIA labels and roles
      this.addARIALabels();

      // Setup screen reader announcements
      this.setupScreenReaderAnnouncements();

      // Add high contrast mode toggle
      this.addHighContrastToggle();

      // Ensure keyboard navigation
      this.ensureKeyboardAccessibility();

      // Add reduced motion support
      this.addReducedMotionSupport();
    }

    addARIALabels() {
      // Main canvas
      const canvas = document.getElementById('visualization-canvas');
      if (canvas) {
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', 'Interactive TypedMind architecture visualization');
        canvas.setAttribute('aria-describedby', 'visualization-description');
      }

      // Add hidden description
      const description = document.createElement('div');
      description.id = 'visualization-description';
      description.className = 'sr-only';
      description.textContent = `Interactive graph showing ${this.data.entities.length} entities and their relationships. Use arrow keys to navigate, Enter to select, and F to focus.`;
      document.body.appendChild(description);

      // Sidebar
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.setAttribute('role', 'navigation');
        sidebar.setAttribute('aria-label', 'Entity navigation and filtering');
      }

      // Entity list
      const entityList = document.getElementById('entity-list');
      if (entityList) {
        entityList.setAttribute('role', 'list');
        entityList.setAttribute('aria-label', 'List of entities');
      }

      // Search input
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.setAttribute('aria-label', 'Search entities');
        searchInput.setAttribute('aria-describedby', 'search-help');

        const searchHelp = document.createElement('div');
        searchHelp.id = 'search-help';
        searchHelp.className = 'sr-only';
        searchHelp.textContent = 'Type to search entities by name, type, or description. Use arrow keys to navigate suggestions.';
        searchInput.parentNode?.appendChild(searchHelp);
      }
    }

    setupScreenReaderAnnouncements() {
      // Create announcement area
      this.announcer = document.createElement('div');
      this.announcer.setAttribute('aria-live', 'polite');
      this.announcer.setAttribute('aria-atomic', 'true');
      this.announcer.className = 'sr-only';
      document.body.appendChild(this.announcer);

      // Override selection methods to include announcements
      const originalSelectEntity = this.selectEntity.bind(this);
      this.selectEntity = (entityName) => {
        originalSelectEntity(entityName);

        const entity = this.data.entities.find(e => e.name === entityName);
        if (entity) {
          this.announceToScreenReader(`Selected ${entity.type}: ${entity.name}${entity.description ? '. ' + entity.description : ''}`);
        }
      };
    }

    announceToScreenReader(message) {
      if (this.announcer) {
        this.announcer.textContent = message;
      }
    }

    addHighContrastToggle() {
      const controlsPanel = document.querySelector('.controls-panel');
      if (!controlsPanel) return;

      const accessibilityGroup = document.createElement('div');
      accessibilityGroup.className = 'control-group';
      accessibilityGroup.innerHTML = `
        <div class="control-label">Accessibility</div>
        <div class="accessibility-controls">
          <label class="checkbox-item">
            <input type="checkbox" id="high-contrast-toggle">
            <span>High Contrast Mode</span>
          </label>
          <label class="checkbox-item">
            <input type="checkbox" id="reduce-motion-toggle">
            <span>Reduce Motion</span>
          </label>
        </div>
      `;

      controlsPanel.appendChild(accessibilityGroup);

      // High contrast toggle
      document.getElementById('high-contrast-toggle')?.addEventListener('change', (e) => {
        document.body.classList.toggle('high-contrast', e.target.checked);
        this.announceToScreenReader(`High contrast mode ${e.target.checked ? 'enabled' : 'disabled'}`);
      });

      // Reduced motion toggle
      document.getElementById('reduce-motion-toggle')?.addEventListener('change', (e) => {
        document.body.classList.toggle('reduce-motion', e.target.checked);
        this.announceToScreenReader(`Reduced motion ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    ensureKeyboardAccessibility() {
      // Make all interactive elements keyboard accessible
      document.querySelectorAll('.toolbar-btn, .layout-btn, .zoom-btn').forEach(btn => {
        if (!btn.hasAttribute('tabindex')) {
          btn.setAttribute('tabindex', '0');
        }

        btn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            btn.click();
          }
        });
      });

      // Focus management for modals and panels
      this.manageFocusForModals();
    }

    manageFocusForModals() {
      // Focus trap for export dialog
      document.addEventListener('keydown', (e) => {
        const exportDialog = document.querySelector('.export-dialog');
        const contextMenu = document.querySelector('.context-menu');

        if (exportDialog || contextMenu) {
          if (e.key === 'Tab') {
            this.trapFocus(e, exportDialog || contextMenu);
          } else if (e.key === 'Escape') {
            if (exportDialog) {
              exportDialog.querySelector('.export-dialog-close')?.click();
            }
            if (contextMenu) {
              this.hideContextMenu();
            }
          }
        }
      });
    }

    trapFocus(event, container) {
      const focusableElements = container.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    addReducedMotionSupport() {
      // Check for user's motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        document.body.classList.add('reduce-motion');
        const reduceMotionToggle = document.getElementById('reduce-motion-toggle');
        if (reduceMotionToggle) {
          reduceMotionToggle.checked = true;
        }
      }

      // Override animations when reduce motion is active
      const checkReducedMotion = () => {
        const isReducedMotion = document.body.classList.contains('reduce-motion');

        if (isReducedMotion) {
          // Disable transitions and animations
          const style = document.createElement('style');
          style.id = 'reduced-motion-styles';
          style.textContent = `
            .reduce-motion *,
            .reduce-motion *::before,
            .reduce-motion *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
            .reduce-motion .flow-dot {
              display: none !important;
            }
          `;
          document.head.appendChild(style);
        } else {
          // Re-enable animations
          const style = document.getElementById('reduced-motion-styles');
          if (style) style.remove();
        }
      };

      // Apply on load
      checkReducedMotion();

      // Watch for changes
      const observer = new MutationObserver(checkReducedMotion);
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
