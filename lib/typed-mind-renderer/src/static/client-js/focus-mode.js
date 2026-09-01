    // ============= FOCUS MODE =============
    focusOnEntity(entityName) {
      const entity = this.data.entities.find(e => e.name === entityName);
      if (!entity) return;

      this.currentViewState.focusedEntity = entityName;

      // Get directly connected entities
      const connectedEntities = new Set([entityName]);
      this.data.links.forEach(link => {
        if (link.source === entityName) {
          connectedEntities.add(link.target);
        } else if (link.target === entityName) {
          connectedEntities.add(link.source);
        }
      });

      // Apply focus visual effects
      this.svg?.selectAll('.node')
        .classed('focus-center', d => d.id === entityName)
        .classed('focus-connected', d => connectedEntities.has(d.id) && d.id !== entityName)
        .classed('focus-dimmed', d => !connectedEntities.has(d.id))
        .style('opacity', d => connectedEntities.has(d.id) ? 1 : 0.3);

      this.svg?.selectAll('line')
        .classed('focus-link', d =>
          (d.source === entityName || d.target === entityName) ||
          (d.source.id === entityName || d.target.id === entityName))
        .style('opacity', d => {
          const sourceId = d.source.id || d.source;
          const targetId = d.target.id || d.target;
          return connectedEntities.has(sourceId) && connectedEntities.has(targetId) ? 1 : 0.1;
        });

      // Center the view on the focused entity
      this.centerViewOnEntity(entityName);

      // Update breadcrumb
      this.updateBreadcrumbs('focus', entityName);

      // Save state
      this.saveViewState();
    }

    centerViewOnEntity(entityName) {
      const node = this.svg?.selectAll('.node').filter(d => d.id === entityName);
      if (!node || node.empty()) return;

      const nodeData = node.datum();
      const svg = this.svg;
      const svgNode = svg.node();
      if (!svgNode) return;

      const rect = svgNode.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const transform = d3.zoomIdentity
        .translate(centerX - nodeData.x, centerY - nodeData.y)
        .scale(1.2);

      svg.transition().duration(750).call(this.zoom.transform, transform);
    }

    exitFocusMode() {
      this.currentViewState.focusedEntity = null;

      if (this.svg) {
        this.svg.selectAll('.node')
          .classed('focus-center', false)
          .classed('focus-connected', false)
          .classed('focus-dimmed', false)
          .style('opacity', 1);

        this.svg.selectAll('line')
          .classed('focus-link', false)
          .style('opacity', d => this.getLinkOpacity(d.type));
      }

      this.saveViewState();
    }

    getLinkOpacity(linkType) {
      return linkType === 'contains' ? 0.5 : 0.7;
    }
