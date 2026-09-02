    // ============= UTILITY METHODS (Enhanced from base) =============
    hideEntity(entityName) {
      this.currentViewState.hiddenEntities.add(entityName);
      this.renderEntityList();
      this.updateVisualization();
      this.saveViewState();

      this.announceToScreenReader(`Hidden entity: ${entityName}`);
    }

    showAllEntities() {
      this.currentViewState.hiddenEntities.clear();
      this.renderEntityList();
      this.updateVisualization();
      this.saveViewState();

      this.announceToScreenReader('Showing all entities');
    }

    exportEntity(entity) {
      const entityData = {
        entity,
        relationships: this.getEntityRelationships(entity),
        connectedEntities: this.getConnectedEntities(entity),
        exportTime: new Date().toISOString()
      };

      this.downloadFile(
        JSON.stringify(entityData, null, 2),
        `${entity.name}-export.json`,
        'application/json'
      );
    }

    getConnectedEntities(entity) {
      const connected = [];

      this.data.links.forEach(link => {
        if (link.source === entity.name) {
          const target = this.data.entities.find(e => e.name === link.target);
          if (target) connected.push({ entity: target, relationship: link.type, direction: 'outgoing' });
        } else if (link.target === entity.name) {
          const source = this.data.entities.find(e => e.name === link.source);
          if (source) connected.push({ entity: source, relationship: link.type, direction: 'incoming' });
        }
      });

      return connected;
    }

    updateVisualization() {
      // Trigger re-render of the visualization with current state
      if (this.simulation) {
        this.simulation.restart();
      }
    }
