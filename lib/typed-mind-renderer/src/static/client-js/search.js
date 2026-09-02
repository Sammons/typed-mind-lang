    // ============= SEARCH AS YOU TYPE =============
    setupAdvancedSearch() {
      const searchInput = document.getElementById('search-input');
      if (!searchInput) return;

      // Create search suggestions dropdown
      const suggestions = document.createElement('div');
      suggestions.id = 'search-suggestions';
      suggestions.className = 'search-suggestions';
      searchInput.parentNode?.appendChild(suggestions);

      let searchTimeout;
      let currentSuggestionIndex = -1;

      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        // Clear previous timeout
        clearTimeout(searchTimeout);

        // Debounce search
        searchTimeout = setTimeout(() => {
          this.performAdvancedSearch(query);
          this.updateSearchSuggestions(query);
        }, 150);
      });

      searchInput.addEventListener('keydown', (e) => {
        const suggestionItems = suggestions.querySelectorAll('.search-suggestion-item');

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestionItems.length - 1);
            this.updateSuggestionHighlight(suggestionItems, currentSuggestionIndex);
            break;

          case 'ArrowUp':
            e.preventDefault();
            currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
            this.updateSuggestionHighlight(suggestionItems, currentSuggestionIndex);
            break;

          case 'Enter':
            e.preventDefault();
            if (currentSuggestionIndex >= 0 && suggestionItems[currentSuggestionIndex]) {
              const suggestion = suggestionItems[currentSuggestionIndex];
              const entityName = suggestion.dataset.entity;
              if (entityName) {
                this.selectEntity(entityName);
                searchInput.value = entityName;
                this.hideSearchSuggestions();
              }
            }
            break;

          case 'Escape':
            this.hideSearchSuggestions();
            searchInput.blur();
            break;
        }
      });

      searchInput.addEventListener('blur', () => {
        // Hide suggestions after a short delay to allow clicking
        setTimeout(() => this.hideSearchSuggestions(), 150);
      });
    }

    performAdvancedSearch(query) {
      if (!query) {
        this.clearSearchHighlights();
        this.currentViewState.searchQuery = '';
        this.renderEntityList();
        return;
      }

      this.currentViewState.searchQuery = query;

      // Multi-field search
      // Issue #36 — this line lives inside generateInteractiveRendererJS's
      // outer non-raw template literal, which drops a single backslash at
      // parse time for any escape it does not recognize, so the previous
      // single-backslash source spelling shipped a whitespace-less pattern
      // to the browser. The doubled backslash below is required so the
      // outer template literal's own escape processing leaves one
      // backslash in the string the browser receives. The biome-ignore is
      // required alongside it: Biome's noUselessEscapeInString autofix
      // re-strips one backslash from this exact spelling on every --write
      // pass (see interactive-renderer.test.ts, case 1), treating it as a
      // needless escape in what it sees as plain string content rather
      // than recognizing it must survive one more layer of unescaping.
      // biome-ignore lint/suspicious/noUselessEscapeInString: the doubled backslash must survive the outer template literal's own escape processing to reach the browser as a single backslash
      const searchTerms = query.toLowerCase().split(/\s+/);
      const matchedEntities = new Set();

      this.data.entities.forEach(entity => {
        let matchScore = 0;

        // Name matching (highest priority)
        if (entity.name.toLowerCase().includes(query.toLowerCase())) {
          matchScore += 10;
        }

        // Fuzzy name matching
        if (this.fuzzyMatch(entity.name.toLowerCase(), query.toLowerCase())) {
          matchScore += 5;
        }

        // Type matching
        if (entity.type.toLowerCase().includes(query.toLowerCase())) {
          matchScore += 3;
        }

        // Path matching
        if (entity.path?.toLowerCase().includes(query.toLowerCase())) {
          matchScore += 2;
        }

        // Description matching
        if (entity.description?.toLowerCase().includes(query.toLowerCase())) {
          matchScore += 2;
        }

        // Multi-term matching
        const entityText = [entity.name, entity.type, entity.path, entity.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const termMatches = searchTerms.filter(term => entityText.includes(term)).length;
        if (termMatches > 0) {
          matchScore += termMatches;
        }

        if (matchScore > 0) {
          matchedEntities.add(entity.name);
        }
      });

      // Apply visual highlighting
      this.highlightSearchResults(matchedEntities, query);

      // Update sidebar
      this.renderEntityList();

      // Update breadcrumb
      if (query) {
        this.updateBreadcrumbs('search', query);
      }
    }

    fuzzyMatch(text, pattern) {
      // Simple fuzzy matching algorithm
      let patternIdx = 0;
      for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
        if (text[i] === pattern[patternIdx]) {
          patternIdx++;
        }
      }
      return patternIdx === pattern.length;
    }

    highlightSearchResults(matchedEntities, query) {
      if (!this.svg) return;

      this.svg.selectAll('.node')
        .classed('search-match', d => matchedEntities.has(d.id))
        .classed('search-dimmed', d => !matchedEntities.has(d.id) && query)
        .style('opacity', d => {
          if (!query) return 1;
          return matchedEntities.has(d.id) ? 1 : 0.3;
        });

      // Highlight text in nodes
      this.svg.selectAll('.node text')
        .each(function(d) {
          if (matchedEntities.has(d.id) && query) {
            d3.select(this).classed('search-highlight', true);
          } else {
            d3.select(this).classed('search-highlight', false);
          }
        });
    }

    updateSearchSuggestions(query) {
      const suggestions = document.getElementById('search-suggestions');
      if (!suggestions) return;

      if (!query) {
        this.hideSearchSuggestions();
        return;
      }

      // Generate suggestions
      const suggestionItems = [];

      // Entity name suggestions
      const entityMatches = this.data.entities
        .filter(entity => entity.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5);

      entityMatches.forEach(entity => {
        suggestionItems.push({
          type: 'entity',
          text: entity.name,
          subtitle: `${entity.type}${entity.path ? ` • ${entity.path}` : ''}`,
          entity: entity.name
        });
      });

      // Type-based suggestions
      const entityTypes = [...new Set(this.data.entities.map(e => e.type))];
      const typeMatches = entityTypes
        .filter(type => type.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3);

      typeMatches.forEach(type => {
        const count = this.data.entities.filter(e => e.type === type).length;
        suggestionItems.push({
          type: 'filter',
          text: `All ${type}s`,
          subtitle: `${count} entities`,
          action: 'filter-type',
          value: type
        });
      });

      // Render suggestions
      suggestions.innerHTML = suggestionItems.map((item) => `
        <div class="search-suggestion-item" data-entity="${item.entity || ''}" data-action="${item.action || ''}" data-value="${item.value || ''}">
          <div class="search-suggestion-text">${item.text}</div>
          <div class="search-suggestion-subtitle">${item.subtitle}</div>
        </div>
      `).join('');

      // Add click handlers
      suggestions.querySelectorAll('.search-suggestion-item').forEach(item => {
        item.addEventListener('mousedown', (e) => { // Use mousedown to fire before blur
          e.preventDefault();

          const entityName = item.dataset.entity;
          const action = item.dataset.action;
          const value = item.dataset.value;

          if (entityName) {
            this.selectEntity(entityName);
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = entityName;
          } else if (action === 'filter-type') {
            this.filterByType(value);
          }

          this.hideSearchSuggestions();
        });
      });

      suggestions.style.display = 'block';
    }

    updateSuggestionHighlight(items, index) {
      items.forEach((item, i) => {
        item.classList.toggle('highlighted', i === index);
      });
    }

    hideSearchSuggestions() {
      const suggestions = document.getElementById('search-suggestions');
      if (suggestions) {
        suggestions.style.display = 'none';
      }
    }

    clearSearchHighlights() {
      if (this.svg) {
        this.svg.selectAll('.node')
          .classed('search-match', false)
          .classed('search-dimmed', false)
          .style('opacity', 1);

        this.svg.selectAll('.node text')
          .classed('search-highlight', false);
      }
    }

    filterByType(type) {
      // Clear all filters first
      this.currentViewState.filters.forEach((_, key) => {
        this.currentViewState.filters.set(key, false);
      });

      // Enable only the selected type
      this.currentViewState.filters.set(type, true);

      this.updateFilterCheckboxes();
      this.renderEntityList();
      this.updateBreadcrumbs('filter', type);
      this.saveViewState();
    }

    updateSearchInput() {
      const searchInput = document.getElementById('search-input');
      if (searchInput && this.currentViewState.searchQuery) {
        searchInput.value = this.currentViewState.searchQuery;
        this.performAdvancedSearch(this.currentViewState.searchQuery);
      }
    }
