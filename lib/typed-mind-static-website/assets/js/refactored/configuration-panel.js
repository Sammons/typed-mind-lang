// ConfigurationPanel - Enhanced configuration panel with validation and error handling
class ConfigurationPanel extends BaseUIComponent {
  constructor(tokenManager, services, config = {}) {
    super('configContent', config);
    
    this.tokenManager = tokenManager;
    this.services = services;
    this.currentProvider = 'openai';
    this.isConfigured = false;
    
    // DOM elements
    this.configToggle = null;
    this.apiProvider = null;
    this.apiToken = null;
    this.tokenToggle = null;
    this.saveConfig = null;
    this.clearConfig = null;
    this.statusIndicator = null;
    
    this.initialize();
  }

  getDefaultConfig() {
    return {
      providers: {
        openai: { name: 'OpenAI', placeholder: 'Enter your OpenAI API token' },
        anthropic: { name: 'Anthropic', placeholder: 'Enter your Anthropic API token' }
      },
      autoSave: false,
      validateOnChange: true
    };
  }

  async initialize() {
    this.initializeElements();
    await this.loadStoredConfiguration();
    this.bindEvents();
    this.render();
    this.updateConfigState();
    
    super.initialize();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.configToggle = document.getElementById('configToggle');
    this.apiProvider = document.getElementById('apiProvider');
    this.apiToken = document.getElementById('apiToken');
    this.tokenToggle = document.getElementById('tokenToggle');
    this.saveConfig = document.getElementById('saveConfig');
    this.clearConfig = document.getElementById('clearConfig');
    
    // Create status indicator if it doesn't exist
    this.createStatusIndicator();
  }

  /**
   * Create configuration status indicator
   */
  createStatusIndicator() {
    if (document.getElementById('configStatus')) {
      this.statusIndicator = document.getElementById('configStatus');
      return;
    }
    
    this.statusIndicator = this.createElement('div', {
      id: 'configStatus',
      className: 'config-status'
    });
    
    // Insert after the config toggle
    if (this.configToggle && this.configToggle.parentNode) {
      this.configToggle.parentNode.insertBefore(
        this.statusIndicator,
        this.configToggle.nextSibling
      );
    }
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (this.configToggle) {
      this.addDOMListener(this.configToggle, 'click', () => this.toggleConfig());
    }
    
    if (this.apiProvider) {
      this.addDOMListener(this.apiProvider, 'change', (e) => 
        this.handleProviderChange(e.target.value)
      );
    }
    
    if (this.tokenToggle) {
      this.addDOMListener(this.tokenToggle, 'click', () => this.toggleTokenVisibility());
    }
    
    if (this.saveConfig) {
      this.addDOMListener(this.saveConfig, 'click', () => this.saveConfiguration());
    }
    
    if (this.clearConfig) {
      this.addDOMListener(this.clearConfig, 'click', () => this.clearConfiguration());
    }
    
    if (this.apiToken) {
      this.addDOMListener(this.apiToken, 'input', () => this.handleTokenInput());
      this.addDOMListener(this.apiToken, 'keydown', (e) => this.handleTokenKeydown(e));
    }
  }

  /**
   * Load stored configuration on startup
   */
  async loadStoredConfiguration() {
    try {
      // Check for stored provider preference
      const storedProvider = localStorage.getItem('typedmind_chat_provider');
      if (storedProvider && this.getConfig('providers')[storedProvider]) {
        this.currentProvider = storedProvider;
        if (this.apiProvider) {
          this.apiProvider.value = storedProvider;
        }
      }

      // Check if token exists for current provider
      const hasToken = this.tokenManager.hasToken(this.currentProvider);
      if (hasToken) {
        this.isConfigured = true;
        this.updateTokenPlaceholder();
      }
      
      this.setState({ 
        currentProvider: this.currentProvider,
        isConfigured: this.isConfigured
      });
      
    } catch (error) {
      console.error('Failed to load configuration:', error);
      this.services.notificationSystem.showError('Failed to load configuration');
    }
  }

  /**
   * Update token placeholder based on configuration state
   */
  updateTokenPlaceholder() {
    if (!this.apiToken) return;
    
    const provider = this.getConfig('providers')[this.currentProvider];
    
    if (this.isConfigured) {
      this.apiToken.placeholder = '••••••••••••••••••••••••••••••••';
      this.apiToken.value = '';
    } else {
      this.apiToken.placeholder = provider ? provider.placeholder : 'Enter API token';
    }
  }

  /**
   * Handle provider selection change
   */
  async handleProviderChange(provider) {
    if (!this.getConfig('providers')[provider]) {
      console.error('Invalid provider:', provider);
      return;
    }
    
    this.currentProvider = provider;
    localStorage.setItem('typedmind_chat_provider', provider);
    
    // Check if token exists for new provider
    const hasToken = this.tokenManager.hasToken(provider);
    this.isConfigured = hasToken;
    
    this.setState({
      currentProvider: provider,
      isConfigured: hasToken
    });
    
    this.updateTokenPlaceholder();
    this.updateConfigState();
    this.showStatus();
    
    this.emit('providerChanged', { provider, isConfigured: hasToken });
  }

  /**
   * Handle token input changes
   */
  handleTokenInput() {
    if (this.getConfig('validateOnChange')) {
      this.validateTokenFormat();
    }
    this.updateSaveButtonState();
  }

  /**
   * Handle token input keydown
   */
  handleTokenKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.saveConfiguration();
    }
  }

  /**
   * Validate token format
   */
  validateTokenFormat() {
    if (!this.apiToken) return true;
    
    const token = this.apiToken.value.trim();
    if (!token) return true;
    
    let isValid = true;
    let message = '';
    
    if (this.currentProvider === 'openai') {
      // OpenAI tokens typically start with 'sk-'
      if (!token.startsWith('sk-') || token.length < 20) {
        isValid = false;
        message = 'OpenAI tokens should start with "sk-" and be at least 20 characters';
      }
    } else if (this.currentProvider === 'anthropic') {
      // Anthropic tokens typically start with 'sk-ant-'
      if (!token.startsWith('sk-ant-') || token.length < 30) {
        isValid = false;
        message = 'Anthropic tokens should start with "sk-ant-" and be at least 30 characters';
      }
    }
    
    this.setState({ tokenValid: isValid, tokenValidationMessage: message });
    this.showTokenValidation(isValid, message);
    
    return isValid;
  }

  /**
   * Show token validation feedback
   */
  showTokenValidation(isValid, message) {
    if (!this.apiToken) return;
    
    // Remove existing validation classes
    this.apiToken.classList.remove('token-valid', 'token-invalid');
    
    if (message) {
      this.apiToken.classList.add(isValid ? 'token-valid' : 'token-invalid');
      this.apiToken.title = message;
    } else {
      this.apiToken.title = '';
    }
  }

  /**
   * Update save button state
   */
  updateSaveButtonState() {
    if (!this.saveConfig || !this.apiToken) return;
    
    const hasToken = this.apiToken.value.trim().length > 0;
    const isValid = this.getState().tokenValid !== false;
    
    this.saveConfig.disabled = !hasToken || !isValid;
  }

  /**
   * Toggle configuration panel visibility
   */
  toggleConfig() {
    const isVisible = this.isVisible();
    
    if (isVisible) {
      this.hide();
      if (this.configToggle) {
        this.configToggle.innerHTML = LucideIcons.settings;
        this.configToggle.title = 'Show configuration';
        this.configToggle.setAttribute('aria-label', 'Open configuration');
      }
    } else {
      this.show();
      if (this.configToggle) {
        this.configToggle.innerHTML = LucideIcons.x;
        this.configToggle.title = 'Hide configuration';
        this.configToggle.setAttribute('aria-label', 'Close configuration');
      }
    }
    
    this.emit('configToggled', { visible: !isVisible });
  }

  /**
   * Toggle token input visibility
   */
  toggleTokenVisibility() {
    if (!this.apiToken || !this.tokenToggle) return;
    
    const isPassword = this.apiToken.type === 'password';
    this.apiToken.type = isPassword ? 'text' : 'password';
    this.tokenToggle.innerHTML = isPassword ? LucideIcons.eyeOff : LucideIcons.eye;
    this.tokenToggle.setAttribute('aria-label', isPassword ? 'Show token' : 'Hide token');
    this.tokenToggle.title = isPassword ? 'Hide token' : 'Show token';
  }

  /**
   * Save API configuration
   */
  async saveConfiguration() {
    const token = this.apiToken ? this.apiToken.value.trim() : '';
    
    if (!token) {
      this.services.notificationSystem.showError('Please enter an API token');
      return;
    }

    if (!this.validateTokenFormat()) {
      this.services.notificationSystem.showError('Invalid token format');
      return;
    }

    try {
      this.setSavingState(true);
      
      // Test the token before saving
      await this.tokenManager.encryptToken(token, this.currentProvider);
      const testResult = await this.services.chatService.testToken(this.currentProvider);
      
      if (!testResult.success) {
        this.services.notificationSystem.showError(`Invalid API token: ${testResult.error}`);
        this.tokenManager.removeToken(this.currentProvider);
        return;
      }

      // Token is valid, update state
      this.isConfigured = true;
      this.setState({ isConfigured: true });
      
      this.updateTokenPlaceholder();
      this.updateConfigState();
      this.showStatus();
      
      this.services.notificationSystem.showSuccess('Configuration saved successfully!');
      this.emit('configurationSaved', { 
        provider: this.currentProvider, 
        isConfigured: true 
      });
      
      // Auto-hide config panel after successful save
      if (this.getConfig('autoHideOnSave', true)) {
        setTimeout(() => this.toggleConfig(), 1000);
      }
      
    } catch (error) {
      console.error('Configuration save error:', error);
      this.services.notificationSystem.showError(`Failed to save configuration: ${error.message}`);
    } finally {
      this.setSavingState(false);
    }
  }

  /**
   * Set saving state UI
   */
  setSavingState(isSaving) {
    if (!this.saveConfig) return;
    
    this.saveConfig.disabled = isSaving;
    this.saveConfig.textContent = isSaving ? 'Saving...' : 'Save Configuration';
    
    if (this.apiToken) {
      this.apiToken.disabled = isSaving;
    }
    
    this.setState({ saving: isSaving });
  }

  /**
   * Clear stored configuration
   */
  clearConfiguration() {
    if (!confirm('Are you sure you want to clear the stored configuration?')) {
      return;
    }
    
    this.tokenManager.removeToken(this.currentProvider);
    this.isConfigured = false;
    
    this.setState({ isConfigured: false });
    this.updateTokenPlaceholder();
    this.updateConfigState();
    this.showStatus();
    
    this.services.notificationSystem.showSuccess('Configuration cleared');
    this.emit('configurationCleared', { provider: this.currentProvider });
  }

  /**
   * Update configuration state UI
   */
  updateConfigState() {
    this.updateSaveButtonState();
    this.emit('configStateChanged', {
      provider: this.currentProvider,
      isConfigured: this.isConfigured
    });
  }

  /**
   * Show configuration status
   */
  showStatus() {
    if (!this.statusIndicator) return;
    
    const provider = this.getConfig('providers')[this.currentProvider];
    const providerName = provider ? provider.name : this.currentProvider;
    
    if (this.isConfigured) {
      this.statusIndicator.innerHTML = `${LucideIcons.check} ${providerName} configured`;
      this.statusIndicator.className = 'config-status configured';
    } else {
      this.statusIndicator.innerHTML = `${LucideIcons.alertTriangle} ${providerName} not configured`;
      this.statusIndicator.className = 'config-status not-configured';
    }
  }

  /**
   * Validate API configuration
   */
  async validateAPI() {
    if (!this.isConfigured) {
      this.services.notificationSystem.showWarning('No API configuration found');
      return false;
    }
    
    try {
      const testResult = await this.services.chatService.testToken(this.currentProvider);
      
      if (testResult.success) {
        this.services.notificationSystem.showSuccess('API configuration is valid');
        return true;
      } else {
        this.services.notificationSystem.showError(`API validation failed: ${testResult.error}`);
        return false;
      }
    } catch (error) {
      this.services.notificationSystem.showError(`API validation error: ${error.message}`);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      provider: this.currentProvider,
      isConfigured: this.isConfigured,
      hasToken: this.tokenManager.hasToken(this.currentProvider)
    };
  }

  /**
   * Check if configuration panel is ready
   */
  isReady() {
    return this.isConfigured && this.tokenManager.hasToken(this.currentProvider);
  }

  render() {
    this.showStatus();
    super.render();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ConfigurationPanel = ConfigurationPanel;
}