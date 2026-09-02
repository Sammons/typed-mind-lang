    // ============= TOOLTIP SYSTEM =============
    setupTooltipSystem() {
      // Create tooltip container
      this.tooltip = d3.select('body').append('div')
        .attr('class', 'interactive-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('background', 'rgba(22, 27, 34, 0.95)')
        .style('border', '1px solid #30363d')
        .style('border-radius', '8px')
        .style('padding', '12px')
        .style('box-shadow', '0 8px 32px rgba(0, 0, 0, 0.3)')
        .style('backdrop-filter', 'blur(8px)')
        .style('z-index', '1000')
        .style('max-width', '300px')
        .style('font-size', '13px')
        .style('color', '#c9d1d9');

      // Add hover events to nodes
      this.svg?.selectAll('.node')
        .on('mouseenter', (event, d) => this.showTooltip(event, d))
        .on('mouseleave', () => this.hideTooltip())
        .on('mousemove', (event) => this.moveTooltip(event));
    }

    showTooltip(event, entity) {
      if (!this.tooltip) return;

      const relationships = this.getEntityRelationships(entity);

      const content = `
        <div style="font-weight: 600; color: #58a6ff; margin-bottom: 8px;">
          ${entity.name}
        </div>
        <div style="color: #8b949e; margin-bottom: 8px; font-size: 11px;">
          ${entity.type}${entity.path ? ` • ${entity.path}` : ''}
        </div>
        ${entity.description ? `<div style="margin-bottom: 8px;">${entity.description}</div>` : ''}

        <div style="margin-bottom: 6px;">
          <div style="color: #58a6ff; font-size: 11px; margin-bottom: 4px;">RELATIONSHIPS</div>
          <div style="font-size: 11px;">
            Imports: ${relationships.imports} • Exports: ${relationships.exports}<br>
            Calls: ${relationships.calls} • Connected: ${relationships.total}
          </div>
        </div>

        <div style="font-size: 10px; color: #6f7681; border-top: 1px solid #30363d; padding-top: 6px; margin-top: 6px;">
          Right-click for actions • Double-click to focus
        </div>
      `;

      this.tooltip
        .style('opacity', 1)
        .html(content);

      this.moveTooltip(event);
    }

    hideTooltip() {
      if (this.tooltip) {
        this.tooltip.style('opacity', 0);
      }
    }

    moveTooltip(event) {
      if (!this.tooltip) return;

      const tooltipNode = this.tooltip.node();
      if (!tooltipNode) return;

      const rect = tooltipNode.getBoundingClientRect();
      const x = event.pageX + 10;
      const y = event.pageY - rect.height / 2;

      // Keep tooltip in viewport
      const adjustedX = x + rect.width > window.innerWidth ? event.pageX - rect.width - 10 : x;
      const adjustedY = Math.max(10, Math.min(window.innerHeight - rect.height - 10, y));

      this.tooltip
        .style('left', `${adjustedX}px`)
        .style('top', `${adjustedY}px`);
    }

    getEntityRelationships(entity) {
      const links = this.data.links.filter(l =>
        l.source === entity.name || l.target === entity.name
      );

      const imports = links.filter(l => l.type === 'import' && l.target === entity.name).length;
      const exports = links.filter(l => l.type === 'export' && l.source === entity.name).length;
      const calls = links.filter(l => l.type === 'call' && l.source === entity.name).length;

      return {
        imports,
        exports,
        calls,
        total: links.length
      };
    }

    getEntityStats(entity) {
      return {
        complexity: this.calculateComplexity(entity),
        connections: this.data.links.filter(l =>
          l.source === entity.name || l.target === entity.name
        ).length
      };
    }

    calculateComplexity(entity) {
      // Simple complexity metric based on relationships and properties
      let complexity = 1;

      if (entity.signature) complexity += entity.signature.length / 50;
      if (entity.methods) complexity += entity.methods.length;
      if (entity.fields) complexity += entity.fields.length;

      return Math.round(complexity * 10) / 10;
    }
