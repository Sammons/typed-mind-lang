    // ============= ENTITY COMPARISON =============
    setupEntityComparison() {
      // Comparison will be triggered from context menu
      this.comparisonEntities = new Set();
    }

    startEntityComparison(entity) {
      if (this.comparisonEntities.has(entity.name)) {
        this.comparisonEntities.delete(entity.name);
      } else {
        this.comparisonEntities.add(entity.name);
      }

      // Show comparison panel when we have 2+ entities
      if (this.comparisonEntities.size >= 2) {
        this.showComparisonPanel();
      } else if (this.comparisonEntities.size === 0) {
        this.hideComparisonPanel();
      }

      this.updateComparisonVisual();
    }

    showComparisonPanel() {
      let panel = document.getElementById('comparison-panel');

      if (!panel) {
        panel = document.createElement('div');
        panel.id = 'comparison-panel';
        panel.className = 'comparison-panel';
        document.body.appendChild(panel);
      }

      const entities = Array.from(this.comparisonEntities)
        .map(name => this.data.entities.find(e => e.name === name))
        .filter(Boolean);

      panel.innerHTML = `
        <div class="comparison-header">
          <div class="comparison-title">📊 Entity Comparison</div>
          <button class="comparison-close">×</button>
        </div>
        <div class="comparison-content">
          <div class="comparison-entities">
            ${entities.map(entity => this.renderComparisonEntity(entity)).join('')}
          </div>
          <div class="comparison-analysis">
            ${this.generateComparisonAnalysis(entities)}
          </div>
        </div>
      `;

      panel.querySelector('.comparison-close')?.addEventListener('click', () => {
        this.hideComparisonPanel();
        this.comparisonEntities.clear();
        this.updateComparisonVisual();
      });

      panel.style.display = 'block';
    }

    renderComparisonEntity(entity) {
      const relationships = this.getEntityRelationships(entity);
      const stats = this.getEntityStats(entity);

      return `
        <div class="comparison-entity">
          <div class="comparison-entity-header">
            <div class="comparison-entity-name">${entity.name}</div>
            <div class="comparison-entity-type">${entity.type}</div>
          </div>
          <div class="comparison-entity-details">
            ${entity.path ? `<div class="comparison-detail">📁 ${entity.path}</div>` : ''}
            ${entity.signature ? `<div class="comparison-detail">⚡ ${entity.signature}</div>` : ''}
            ${entity.description ? `<div class="comparison-detail">📝 ${entity.description}</div>` : ''}
          </div>
          <div class="comparison-entity-metrics">
            <div class="comparison-metric">
              <span class="comparison-metric-label">Imports:</span>
              <span class="comparison-metric-value">${relationships.imports}</span>
            </div>
            <div class="comparison-metric">
              <span class="comparison-metric-label">Exports:</span>
              <span class="comparison-metric-value">${relationships.exports}</span>
            </div>
            <div class="comparison-metric">
              <span class="comparison-metric-label">Calls:</span>
              <span class="comparison-metric-value">${relationships.calls}</span>
            </div>
            <div class="comparison-metric">
              <span class="comparison-metric-label">Connected:</span>
              <span class="comparison-metric-value">${relationships.total}</span>
            </div>
          </div>
        </div>
      `;
    }

    generateComparisonAnalysis(entities) {
      if (entities.length < 2) return '';

      // Find similarities and differences
      const types = entities.map(e => e.type);
      const sameType = new Set(types).size === 1;

      const similarities = [];
      const differences = [];

      if (sameType) {
        similarities.push(`All entities are of type: ${types[0]}`);
      } else {
        differences.push(`Different types: ${[...new Set(types)].join(', ')}`);
      }

      // Compare relationship counts
      const relationships = entities.map(e => this.getEntityRelationships(e));
      const totalConnections = relationships.map(r => r.total);
      const avgConnections = totalConnections.reduce((a, b) => a + b, 0) / totalConnections.length;

      const mostConnected = entities[totalConnections.indexOf(Math.max(...totalConnections))];
      const leastConnected = entities[totalConnections.indexOf(Math.min(...totalConnections))];

      return `
        <div class="comparison-analysis-section">
          <div class="comparison-analysis-title">Similarities</div>
          <div class="comparison-analysis-items">
            ${similarities.map(s => `<div class="comparison-analysis-item">✓ ${s}</div>`).join('')}
          </div>
        </div>
        <div class="comparison-analysis-section">
          <div class="comparison-analysis-title">Differences</div>
          <div class="comparison-analysis-items">
            ${differences.map(d => `<div class="comparison-analysis-item">• ${d}</div>`).join('')}
          </div>
        </div>
        <div class="comparison-analysis-section">
          <div class="comparison-analysis-title">Insights</div>
          <div class="comparison-analysis-items">
            <div class="comparison-analysis-item">📈 Most connected: ${mostConnected.name} (${Math.max(...totalConnections)} connections)</div>
            <div class="comparison-analysis-item">📉 Least connected: ${leastConnected.name} (${Math.min(...totalConnections)} connections)</div>
            <div class="comparison-analysis-item">📊 Average connections: ${avgConnections.toFixed(1)}</div>
          </div>
        </div>
      `;
    }

    hideComparisonPanel() {
      const panel = document.getElementById('comparison-panel');
      if (panel) {
        panel.style.display = 'none';
      }
    }

    updateComparisonVisual() {
      if (this.svg) {
        this.svg.selectAll('.node')
          .classed('comparison-entity', d => this.comparisonEntities.has(d.id));
      }
    }
