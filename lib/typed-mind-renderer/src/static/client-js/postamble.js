
  // Initialize the interactive application
  const interactiveApp = new InteractiveTypedMindApplication(graphData, rendererOptions);

  // Make globally available
  window.typedMindApp = interactiveApp;

  // Backward compatibility API (enhanced)
  window.typedMindRenderer = {
    zoomFit: () => interactiveApp.zoomToFit(),
    toggleLayout: () => {
      const layouts = ['hierarchical', 'radial', 'semantic'];
      const current = interactiveApp.currentViewState.layoutType;
      const nextIndex = (layouts.indexOf(current) + 1) % layouts.length;
      interactiveApp.switchLayout(layouts[nextIndex]);
    },
    clearSelection: () => interactiveApp.clearSelection(),
    selectNode: (nodeId) => interactiveApp.selectEntity(nodeId),
    focusNode: (nodeId) => interactiveApp.focusOnEntity(nodeId),
    exportView: () => interactiveApp.showExportDialog(),
    undo: () => interactiveApp.undo(),
    redo: () => interactiveApp.redo()
  };

})();