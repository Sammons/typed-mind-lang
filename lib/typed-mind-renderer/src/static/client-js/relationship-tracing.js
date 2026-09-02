    // ============= RELATIONSHIP TRACING =============
    enableRelationshipTracing(entityName) {
      this.disableRelationshipTracing(); // Clear any existing tracing

      const entity = this.data.entities.find(e => e.name === entityName);
      if (!entity) return;

      // Find all related entities
      const relatedEntities = new Set([entityName]);
      const tracePaths = [];

      // Direct relationships
      this.data.links.forEach(link => {
        if (link.source === entityName) {
          relatedEntities.add(link.target);
          tracePaths.push({ source: link.source, target: link.target, type: link.type, level: 1 });
        } else if (link.target === entityName) {
          relatedEntities.add(link.source);
          tracePaths.push({ source: link.source, target: link.target, type: link.type, level: 1 });
        }
      });

      // Secondary relationships (depth 2)
      const directRelated = Array.from(relatedEntities);
      directRelated.forEach(relatedEntity => {
        if (relatedEntity === entityName) return;

        this.data.links.forEach(link => {
          if (link.source === relatedEntity && !relatedEntities.has(link.target)) {
            relatedEntities.add(link.target);
            tracePaths.push({ source: link.source, target: link.target, type: link.type, level: 2 });
          } else if (link.target === relatedEntity && !relatedEntities.has(link.source)) {
            relatedEntities.add(link.source);
            tracePaths.push({ source: link.source, target: link.target, type: link.type, level: 2 });
          }
        });
      });

      // Apply visual effects
      this.svg?.selectAll('.node')
        .classed('trace-related', d => relatedEntities.has(d.id))
        .classed('trace-focus', d => d.id === entityName)
        .classed('trace-dimmed', d => !relatedEntities.has(d.id));

      this.svg?.selectAll('line')
        .classed('trace-path', d =>
          tracePaths.some(tp =>
            (tp.source === d.source.id || tp.source === d.source) &&
            (tp.target === d.target.id || tp.target === d.target)
          ))
        .classed('trace-dimmed', d =>
          !tracePaths.some(tp =>
            (tp.source === d.source.id || tp.source === d.source) &&
            (tp.target === d.target.id || tp.target === d.target)
          ));

      // Add animated flow effect
      this.animateRelationshipFlow(tracePaths);

      // Update breadcrumb
      this.updateBreadcrumbs('trace', entityName);

      // Show trace info panel
      this.showTraceInfoPanel(entityName, Array.from(relatedEntities), tracePaths);
    }

    animateRelationshipFlow(tracePaths) {
      const svg = this.svg;
      if (!svg) return;

      tracePaths.forEach(path => {
        const line = svg.select(`line[data-source="${path.source}"][data-target="${path.target}"]`);
        if (line.empty()) return;

        // Create animated flow dot
        const dot = svg.append('circle')
          .attr('class', 'flow-dot')
          .attr('r', 4)
          .attr('fill', '#58a6ff')
          .attr('opacity', 0.8);

        // Animate along path
        const pathElement = line.node();
        const pathLength = pathElement?.getTotalLength() || 0;

        if (pathLength > 0) {
          const animationDuration = Math.max(1000, pathLength * 2); // Scale with length

          dot.transition()
            .duration(animationDuration)
            .ease(d3.easeLinear)
            .attrTween('transform', () => {
              return (t) => {
                const point = pathElement.getPointAtLength(t * pathLength);
                return `translate(${point.x}, ${point.y})`;
              };
            })
            .on('end', () => dot.remove());
        }
      });
    }

    disableRelationshipTracing() {
      if (this.svg) {
        this.svg.selectAll('.node')
          .classed('trace-related', false)
          .classed('trace-focus', false)
          .classed('trace-dimmed', false);

        this.svg.selectAll('line')
          .classed('trace-path', false)
          .classed('trace-dimmed', false);

        this.svg.selectAll('.flow-dot').remove();
      }

      this.hideTraceInfoPanel();
    }

    showTraceInfoPanel(entityName, relatedEntities, tracePaths) {
      const panel = document.createElement('div');
      panel.id = 'trace-info-panel';
      panel.className = 'trace-info-panel';
      panel.innerHTML = `
        <div class="trace-info-header">
          <div class="trace-info-title">🔗 Relationship Tracing</div>
          <button class="trace-info-close">×</button>
        </div>
        <div class="trace-info-content">
          <div class="trace-info-section">
            <div class="trace-info-section-title">Focus Entity</div>
            <div class="trace-info-entity">${entityName}</div>
          </div>
          <div class="trace-info-section">
            <div class="trace-info-section-title">Related Entities (${relatedEntities.length - 1})</div>
            <div class="trace-info-entities">
              ${relatedEntities.filter(e => e !== entityName).map(entity =>
                `<span class="trace-info-entity-tag">${entity}</span>`
              ).join('')}
            </div>
          </div>
          <div class="trace-info-section">
            <div class="trace-info-section-title">Relationship Paths (${tracePaths.length})</div>
            <div class="trace-info-paths">
              ${tracePaths.slice(0, 10).map(path =>
                `<div class="trace-info-path">
                  ${path.source} → ${path.target} (${path.type})
                </div>`
              ).join('')}
              ${tracePaths.length > 10 ? `<div class="trace-info-more">... and ${tracePaths.length - 10} more</div>` : ''}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(panel);

      panel.querySelector('.trace-info-close')?.addEventListener('click', () => {
        this.disableRelationshipTracing();
      });
    }

    hideTraceInfoPanel() {
      const panel = document.getElementById('trace-info-panel');
      if (panel) {
        panel.remove();
      }
    }
