    // ============= MULTI-SELECTION SYSTEM =============
    setupMultiSelection() {
      if (!this.options.enableMultiSelection) return;

      const svg = this.svg;
      let isSelecting = false;
      let selectionRect = null;
      let startPoint = null;

      // Selection rectangle drawing
      svg.on('mousedown', (event) => {
        if (event.ctrlKey || event.metaKey || event.button === 2) return;

        const point = d3.pointer(event, svg.node());
        startPoint = point;
        isSelecting = true;

        // Create selection rectangle
        selectionRect = svg.append('rect')
          .attr('class', 'selection-rectangle')
          .attr('x', point[0])
          .attr('y', point[1])
          .attr('width', 0)
          .attr('height', 0)
          .attr('fill', 'rgba(88, 166, 255, 0.1)')
          .attr('stroke', '#58a6ff')
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5')
          .style('pointer-events', 'none');

        event.preventDefault();
      });

      svg.on('mousemove', (event) => {
        if (!isSelecting || !selectionRect) return;

        const point = d3.pointer(event, svg.node());
        const x = Math.min(startPoint[0], point[0]);
        const y = Math.min(startPoint[1], point[1]);
        const width = Math.abs(point[0] - startPoint[0]);
        const height = Math.abs(point[1] - startPoint[1]);

        selectionRect
          .attr('x', x)
          .attr('y', y)
          .attr('width', width)
          .attr('height', height);

        // Highlight nodes in selection area
        this.highlightNodesInArea(x, y, width, height);
      });

      svg.on('mouseup', (event) => {
        if (!isSelecting) return;

        if (selectionRect) {
          const rect = selectionRect.node().getBBox();
          const selectedNodes = this.getNodesInArea(rect.x, rect.y, rect.width, rect.height);

          if (!event.ctrlKey && !event.metaKey) {
            this.currentViewState.selectedEntities.clear();
          }

          selectedNodes.forEach(node => {
            this.currentViewState.selectedEntities.add(node.id);
          });

          this.updateSelectionDisplay();
          this.saveViewState();
          selectionRect.remove();
        }

        isSelecting = false;
        selectionRect = null;
        startPoint = null;
      });
    }

    handleNodeClick(event, node) {
      if (event.ctrlKey || event.metaKey) {
        // Multi-select mode
        if (this.currentViewState.selectedEntities.has(node.id)) {
          this.currentViewState.selectedEntities.delete(node.id);
        } else {
          this.currentViewState.selectedEntities.add(node.id);
        }
      } else {
        // Single select
        this.currentViewState.selectedEntities.clear();
        this.currentViewState.selectedEntities.add(node.id);
        this.currentViewState.focusedEntity = node.id;
      }

      this.updateSelectionDisplay();
      this.updateEntityDetails();
      this.saveViewState();
      event.stopPropagation();
    }

    getNodesInArea(x, y, width, height) {
      if (!this.svg) return [];

      const nodes = [];
      this.svg.selectAll('.node').each(function(d) {
        const nodeRect = this.getBoundingClientRect();
        const svgRect = d.svg?.node()?.getBoundingClientRect();

        if (nodeRect && svgRect) {
          const nodeX = nodeRect.left - svgRect.left;
          const nodeY = nodeRect.top - svgRect.top;

          if (nodeX >= x && nodeX <= x + width &&
              nodeY >= y && nodeY <= y + height) {
            nodes.push(d);
          }
        }
      });

      return nodes;
    }

    highlightNodesInArea(x, y, width, height) {
      if (!this.svg) return;

      this.svg.selectAll('.node').classed('in-selection', function(d) {
        const nodeRect = this.getBoundingClientRect();
        const svgRect = d.svg?.node()?.getBoundingClientRect();

        if (nodeRect && svgRect) {
          const nodeX = nodeRect.left - svgRect.left;
          const nodeY = nodeRect.top - svgRect.top;

          return nodeX >= x && nodeX <= x + width &&
                 nodeY >= y && nodeY <= y + height;
        }
        return false;
      });
    }
