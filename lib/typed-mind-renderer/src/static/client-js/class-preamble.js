  class InteractiveTypedMindApplication {
    constructor(data, options) {
      this.data = data;
      this.options = options;

      // Core state management
      this.currentViewState = {
        selectedEntities: new Set(),
        focusedEntity: null,
        hiddenEntities: new Set(),
        filters: new Map([
          ['Program', true], ['File', true], ['Function', true],
          ['Class', true], ['ClassFile', true], ['DTO', true],
          ['Constants', true], ['UIComponent', true], ['Asset', true],
          ['RunParameter', true], ['Dependency', true]
        ]),
        zoomLevel: 100,
        panPosition: { x: 0, y: 0 },
        layoutType: 'hierarchical',
        searchQuery: ''
      };

      // History and interaction tracking
      this.viewHistory = [];
      this.undoStack = [];
      this.redoStack = [];
      this.bookmarks = new Map();
      this.performanceMetrics = new Map();

      // UI state
      this.isMultiSelecting = false;
      this.selectionRectangle = null;
      this.dragStart = null;
      this.tooltip = null;
      this.contextMenu = null;

      // Performance tracking
      this.frameCount = 0;
      this.lastFrameTime = performance.now();
      this.fps = 60;

      this.init();
    }

    init() {
      this.saveViewState(); // Initial state
      this.setupEventListeners();
      this.setupAccessibility();
      this.renderEntityList();
      this.initializeVisualization();
      this.updateFilterCheckboxes();
      this.setupTooltipSystem();
      this.setupBreadcrumbNavigation();
      this.startPerformanceMonitoring();
    }
