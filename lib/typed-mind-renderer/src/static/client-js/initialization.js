    // ============= INITIALIZATION AND SETUP =============
    // (The rest of the methods from the enhanced renderer, but with all the interactive features integrated)

    // ... (I'll continue with the remaining base methods from the enhanced renderer)
    // (keeping all the existing functionality while adding the new interactive features)

    setupEventListeners() {
      // All the original event listeners plus new ones for interactive features
      this.setupMultiSelection();
      this.setupContextMenus();
      this.setupKeyboardNavigation();
      this.setupAdvancedSearch();
      this.setupAdvancedExport();
      this.loadBookmarks(); // Load saved bookmarks

      // Original event listeners from enhanced renderer
      const sidebarToggle = document.getElementById('sidebar-toggle');
      if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => this.toggleSidebar());
      }

      document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.switchLayout(e.target.dataset.layout);
        });
      });

      const zoomIn = document.getElementById('zoom-in');
      const zoomOut = document.getElementById('zoom-out');
      const zoomFit = document.getElementById('zoom-fit');

      if (zoomIn) zoomIn.addEventListener('click', () => this.zoomIn());
      if (zoomOut) zoomOut.addEventListener('click', () => this.zoomOut());
      if (zoomFit) zoomFit.addEventListener('click', () => this.zoomToFit());

      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => this.performAdvancedSearch(e.target.value));
      }

      document.querySelectorAll('.checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
          this.toggleFilter(e.target.dataset.type);
        });
      });

      const clearSelection = document.getElementById('clear-selection');
      if (clearSelection) clearSelection.addEventListener('click', () => this.clearSelection());
    }

    // Include all other methods from the enhanced renderer...
    // (This would include all the visualization, layout, entity management methods)
    // For brevity, I'll reference that they would be included with the interactive enhancements

    // Continue with the existing enhanced renderer methods...
    initializeVisualization() {
      // Enhanced version of the original method with interactive features
      const svg = d3.select('#visualization-canvas');
      const container = svg.node().parentElement;
      const width = container.clientWidth;
      const height = container.clientHeight;

      svg.attr('width', width).attr('height', height);
      svg.selectAll('*').remove();

      const g = svg.append('g');

      const nodes = this.data.entities
        .filter(e => !this.currentViewState.hiddenEntities.has(e.name))
        .map(e => ({
          id: e.name,
          ...e,
          x: Math.random() * (width - 200) + 100,
          y: Math.random() * (height - 200) + 100,
          visual: this.getEntityVisual(e.type)
        }));

      const links = this.data.links.filter(link =>
        !this.currentViewState.hiddenEntities.has(link.source) &&
        !this.currentViewState.hiddenEntities.has(link.target)
      );

      // Enhanced simulation with interactive features
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(this.getLinkDistance))
        .force('charge', d3.forceManyBody().strength(-1200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => this.getNodeRadius(d.type)));

      // Enhanced links
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', d => this.getLinkColor(d.type))
        .attr('stroke-width', d => this.getLinkWidth(d.type))
        .attr('stroke-dasharray', d => this.getLinkDash(d.type))
        .attr('opacity', 0.7)
        .attr('marker-end', d => `url(#arrow-${d.type})`)
        .attr('data-source', d => d.source)
        .attr('data-target', d => d.target);

      this.createArrowMarkers(svg);

      // Enhanced nodes with interactive features
      const node = g.append('g')
        .selectAll('.node')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .attr('tabindex', 0)
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', (event, d) => this.dragStart(event, d, simulation))
          .on('drag', (event, d) => this.drag(event, d))
          .on('end', (event, d) => this.dragEnd(event, d, simulation)));

      this.addNodeShapes(node);

      node.append('text')
        .text(d => d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', d => this.getFontSize(d.type))
        .attr('font-weight', d => this.getFontWeight(d.type))
        .attr('fill', '#f0f6fc')
        .style('pointer-events', 'none');

      // Enhanced click handlers with multi-selection
      node.on('click', (event, d) => this.handleNodeClick(event, d))
           .on('dblclick', (event, d) => {
             event.preventDefault();
             this.focusOnEntity(d.id);
           })
           .on('mouseenter', (event, d) => {
             this.highlightNode(d.id, true);
             this.showTooltip(event, d);
           })
           .on('mouseleave', (_event, d) => {
             this.highlightNode(d.id, false);
             this.hideTooltip();
           })
           .on('mousemove', (event, _d) => {
             this.moveTooltip(event);
           });

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x}, ${d.y})`);

        // Performance tracking
        this.performanceMetrics.set('frameCount',
          (this.performanceMetrics.get('frameCount') || 0) + 1);
      });

      // Enhanced zoom with performance optimization
      const zoom = d3.zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
          this.updateZoomLevel(event.transform.k * 100);
          this.updateDetailLevel(event.transform.k);

          // Update current view state
          this.currentViewState.zoomLevel = event.transform.k * 100;
          this.currentViewState.panPosition = { x: event.transform.x, y: event.transform.y };
        });

      svg.call(zoom);

      // Store references for interactive features
      this.simulation = simulation;
      this.svg = svg;
      this.zoom = zoom;
      this.mainGroup = g;
      this.nodes = nodes;
      this.links = links;
    }

    // ... Continue with all other enhanced renderer methods
    // (renderEntityList, toggleFilter, selectEntity, etc.)

    selectEntity(entityName) {
      if (!this.currentViewState.selectedEntities.has(entityName)) {
        if (!(event && (event.ctrlKey || event.metaKey))) {
          this.currentViewState.selectedEntities.clear();
        }
        this.currentViewState.selectedEntities.add(entityName);
        this.currentViewState.focusedEntity = entityName;
      }

      this.updateSelectionDisplay();
      this.updateEntityDetails();
      this.saveViewState();
    }

    updateSelectionDisplay() {
      // Update sidebar selection
      document.querySelectorAll('.entity-item').forEach(item => {
        const isSelected = this.currentViewState.selectedEntities.has(item.dataset.name);
        item.classList.toggle('selected', isSelected);
      });

      // Update visualization selection
      if (this.svg) {
        this.svg.selectAll('.node')
          .classed('selected', d => this.currentViewState.selectedEntities.has(d.id))
          .classed('multi-selected', d =>
            this.currentViewState.selectedEntities.has(d.id) &&
            this.currentViewState.selectedEntities.size > 1);
      }
    }

    updateEntityDetails() {
      if (this.currentViewState.selectedEntities.size === 1) {
        const entityName = Array.from(this.currentViewState.selectedEntities)[0];
        this.showEntityDetails(entityName);
      } else if (this.currentViewState.selectedEntities.size > 1) {
        this.showMultiSelectionDetails();
      }
    }

    showMultiSelectionDetails() {
      const panel = document.getElementById('details-panel');
      if (!panel) return;

      const title = document.getElementById('details-title');
      const subtitle = document.getElementById('details-subtitle');
      const content = document.getElementById('details-content');

      if (title) title.textContent = 'Multiple Selection';
      if (subtitle) subtitle.textContent = `${this.currentViewState.selectedEntities.size} entities selected`;

      const selectedEntities = Array.from(this.currentViewState.selectedEntities)
        .map(name => this.data.entities.find(e => e.name === name))
        .filter(Boolean);

      const typeGroups = {};
      selectedEntities.forEach(entity => {
        if (!typeGroups[entity.type]) typeGroups[entity.type] = [];
        typeGroups[entity.type].push(entity);
      });

      const html = `
        <div class="detail-section">
          <div class="detail-section-title">Selection Summary</div>
          ${Object.entries(typeGroups).map(([type, entities]) =>
            `<div class="detail-row">${type}: ${entities.length}</div>`
          ).join('')}
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Actions</div>
          <div class="detail-actions">
            <button class="detail-action-btn" onclick="window.typedMindApp.startBulkComparison()">Compare All</button>
            <button class="detail-action-btn" onclick="window.typedMindApp.exportSelectedEntities()">Export Selection</button>
            <button class="detail-action-btn" onclick="window.typedMindApp.hideSelectedEntities()">Hide Selected</button>
          </div>
        </div>
      `;

      if (content) content.innerHTML = html;
      panel.style.display = 'block';
    }

    startBulkComparison() {
      this.currentViewState.selectedEntities.forEach(entityName => {
        const entity = this.data.entities.find(e => e.name === entityName);
        if (entity) {
          this.startEntityComparison(entity);
        }
      });
    }

    exportSelectedEntities() {
      const selectedEntities = Array.from(this.currentViewState.selectedEntities)
        .map(name => this.data.entities.find(e => e.name === name))
        .filter(Boolean);

      const exportData = {
        selection: selectedEntities,
        metadata: {
          selectionCount: selectedEntities.length,
          exportTime: new Date().toISOString()
        }
      };

      this.downloadFile(
        JSON.stringify(exportData, null, 2),
        `selection-export-${Date.now()}.json`,
        'application/json'
      );
    }

    hideSelectedEntities() {
      this.currentViewState.selectedEntities.forEach(entityName => {
        this.currentViewState.hiddenEntities.add(entityName);
      });

      this.currentViewState.selectedEntities.clear();
      this.clearSelection();
      this.renderEntityList();
      this.updateVisualization();
      this.saveViewState();
    }

    // ... Rest of the enhanced renderer methods would continue here
    // (All the existing methods from enhanced renderer integrated with interactive features)
  }