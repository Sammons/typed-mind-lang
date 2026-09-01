    // ============= ENHANCED EXPORT FUNCTIONALITY =============
    setupAdvancedExport() {
      const exportBtn = document.getElementById('export-svg');
      if (!exportBtn) return;

      // Replace simple export with advanced options
      exportBtn.addEventListener('click', () => this.showExportDialog());
    }

    showExportDialog() {
      const dialog = document.createElement('div');
      dialog.className = 'export-dialog';
      dialog.innerHTML = `
        <div class="export-dialog-overlay"></div>
        <div class="export-dialog-content">
          <div class="export-dialog-header">
            <h3>Export Visualization</h3>
            <button class="export-dialog-close">×</button>
          </div>
          <div class="export-dialog-body">
            <div class="export-format-group">
              <label>Format:</label>
              <select id="export-format">
                <option value="svg">SVG (Vector)</option>
                <option value="png">PNG (High Quality)</option>
                <option value="png-hd">PNG (Ultra HD)</option>
                <option value="json">JSON (Data)</option>
                <option value="csv">CSV (Entity List)</option>
              </select>
            </div>

            <div class="export-options-group" id="image-options">
              <label>
                <input type="checkbox" id="export-include-hidden"> Include hidden entities
              </label>
              <label>
                <input type="checkbox" id="export-high-contrast"> High contrast mode
              </label>
              <label>
                <input type="checkbox" id="export-transparent-bg" checked> Transparent background
              </label>
            </div>

            <div class="export-size-group" id="size-options">
              <label>Size:</label>
              <select id="export-size">
                <option value="current">Current View</option>
                <option value="fit">Fit All Content</option>
                <option value="custom">Custom Size</option>
              </select>

              <div id="custom-size-inputs" style="display: none;">
                <input type="number" id="export-width" placeholder="Width" value="1920">
                <input type="number" id="export-height" placeholder="Height" value="1080">
              </div>
            </div>
          </div>
          <div class="export-dialog-footer">
            <button id="export-cancel" class="export-btn export-btn-secondary">Cancel</button>
            <button id="export-confirm" class="export-btn export-btn-primary">Export</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      // Setup dialog events
      const closeDialog = () => dialog.remove();

      dialog.querySelector('.export-dialog-close')?.addEventListener('click', closeDialog);
      dialog.querySelector('.export-dialog-overlay')?.addEventListener('click', closeDialog);
      dialog.querySelector('#export-cancel')?.addEventListener('click', closeDialog);

      dialog.querySelector('#export-format')?.addEventListener('change', (e) => {
        const format = e.target.value;
        const imageOptions = document.getElementById('image-options');
        const sizeOptions = document.getElementById('size-options');

        if (format === 'json' || format === 'csv') {
          imageOptions.style.display = 'none';
          sizeOptions.style.display = 'none';
        } else {
          imageOptions.style.display = 'block';
          sizeOptions.style.display = 'block';
        }
      });

      dialog.querySelector('#export-size')?.addEventListener('change', (e) => {
        const customInputs = document.getElementById('custom-size-inputs');
        if (customInputs) {
          customInputs.style.display = e.target.value === 'custom' ? 'flex' : 'none';
        }
      });

      dialog.querySelector('#export-confirm')?.addEventListener('click', () => {
        this.performAdvancedExport();
        closeDialog();
      });
    }

    async performAdvancedExport() {
      const format = document.getElementById('export-format')?.value || 'svg';
      const includeHidden = document.getElementById('export-include-hidden')?.checked || false;
      const highContrast = document.getElementById('export-high-contrast')?.checked || false;
      const transparentBg = document.getElementById('export-transparent-bg')?.checked || true;
      const sizeOption = document.getElementById('export-size')?.value || 'current';

      this.showLoadingOverlay();

      try {
        let result;

        switch (format) {
          case 'svg':
            result = await this.exportAsSVG({ includeHidden, highContrast, transparentBg, sizeOption });
            break;
          case 'png':
          case 'png-hd':
            result = await this.exportAsPNG({
              includeHidden,
              highContrast,
              transparentBg,
              sizeOption,
              quality: format === 'png-hd' ? 'ultra' : 'high'
            });
            break;
          case 'json':
            result = this.exportAsJSON({ includeHidden });
            break;
          case 'csv':
            result = this.exportAsCSV({ includeHidden });
            break;
          default:
            throw new Error('Unsupported format');
        }

        this.downloadFile(result.data, result.filename, result.mimeType);

      } catch (_error) {
        console.error('Export failed:', error);
        this.showNotification('Export failed: ' + error.message, 'error');
      } finally {
        this.hideLoadingOverlay();
      }
    }

    async exportAsSVG(options) {
      const svg = this.svg?.node();
      if (!svg) throw new Error('No visualization to export');

      const clonedSvg = svg.cloneNode(true);

      // Apply export options
      if (!options.includeHidden) {
        // Remove hidden elements
        clonedSvg.querySelectorAll('.hidden, .focus-dimmed').forEach(el => el.remove());
      }

      if (options.highContrast) {
        // Apply high contrast styles
        this.applyHighContrastToSVG(clonedSvg);
      }

      if (!options.transparentBg) {
        // Add background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', '#0d1117');
        clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      }

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);

      return {
        data: svgString,
        filename: `typedmind-export-${Date.now()}.svg`,
        mimeType: 'image/svg+xml'
      };
    }

    async exportAsPNG(options) {
      const svgResult = await this.exportAsSVG(options);

      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        const scale = options.quality === 'ultra' ? 3 : 2;
        canvas.width = (this.svg?.attr('width') || 800) * scale;
        canvas.height = (this.svg?.attr('height') || 600) * scale;
        ctx.scale(scale, scale);

        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                data: blob,
                filename: `typedmind-export-${Date.now()}.png`,
                mimeType: 'image/png'
              });
            } else {
              reject(new Error('Failed to create PNG'));
            }
          });
        };

        img.onerror = () => reject(new Error('Failed to load SVG'));
        img.src = 'data:image/svg+xml;base64,' + btoa(svgResult.data);
      });
    }

    exportAsJSON(options) {
      const data = {
        metadata: {
          exportTime: new Date().toISOString(),
          version: '1.0',
          includeHidden: options.includeHidden
        },
        entities: this.data.entities.filter(entity =>
          options.includeHidden || !this.currentViewState.hiddenEntities.has(entity.name)
        ),
        links: this.data.links,
        viewState: this.currentViewState,
        errors: this.data.errors || []
      };

      return {
        data: JSON.stringify(data, null, 2),
        filename: `typedmind-data-${Date.now()}.json`,
        mimeType: 'application/json'
      };
    }

    exportAsCSV(options) {
      const entities = this.data.entities.filter(entity =>
        options.includeHidden || !this.currentViewState.hiddenEntities.has(entity.name)
      );

      if (entities.length === 0) {
        throw new Error('No entities to export');
      }

      const headers = ['name', 'type', 'path', 'signature', 'description'];
      const csvRows = [
        headers.join(','),
        ...entities.map(entity =>
          headers.map(header => {
            const value = entity[header] || '';
            // Escape CSV values
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];

      return {
        data: csvRows.join('\n'),
        filename: `typedmind-entities-${Date.now()}.csv`,
        mimeType: 'text/csv'
      };
    }

    downloadFile(data, filename, mimeType) {
      const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      this.showNotification(`Exported as ${filename}`, 'success');
    }

    applyHighContrastToSVG(svg) {
      // High contrast transformations
      svg.querySelectorAll('rect, circle, polygon').forEach(shape => {
        const fill = shape.getAttribute('fill');
        const stroke = shape.getAttribute('stroke');

        // Convert to high contrast colors
        if (fill && fill !== 'none') {
          shape.setAttribute('fill', this.getHighContrastColor(fill));
        }
        if (stroke && stroke !== 'none') {
          shape.setAttribute('stroke', this.getHighContrastStroke(stroke));
        }

        // Increase stroke width for visibility
        const strokeWidth = parseInt(shape.getAttribute('stroke-width') || '1');
        shape.setAttribute('stroke-width', Math.max(2, strokeWidth * 1.5));
      });

      svg.querySelectorAll('text').forEach(text => {
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-weight', 'bold');
      });

      svg.querySelectorAll('line').forEach(line => {
        line.setAttribute('stroke', '#ffffff');
        line.setAttribute('stroke-width', '3');
      });
    }

    getHighContrastColor(color) {
      // Simple high contrast mapping
      const contrastMap = {
        '#1f6feb': '#ffffff',
        '#21262d': '#000000',
        '#0d1117': '#000000',
        '#161b22': '#333333',
        '#3fb950': '#00ff00',
        '#f85149': '#ff0000',
        '#0969da': '#0080ff',
      };

      return contrastMap[color] || '#ffffff';
    }

    getHighContrastStroke(color) {
      return color === '#ffffff' ? '#000000' : '#ffffff';
    }
