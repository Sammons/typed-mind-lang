// Chat UI - User interface management for the AI Assistant
class ChatUI {
  constructor() {
    this.tokenManager = new TokenManager();
    this.checkpointManager = new CodeCheckpointManager();
    this.chatService = new ChatService(this.tokenManager, this.checkpointManager);
    this.conversationHistory = [];
    this.currentProvider = 'openai';
    this.isConfigured = false;
    
    this.initializeElements();
    this.bindEvents();
    this.loadStoredConfiguration();
    this.loadChatHistory();
    this.initializeCheckpointUI();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    // Configuration elements
    this.configToggle = document.getElementById('configToggle');
    this.configContent = document.getElementById('configContent');
    this.apiProvider = document.getElementById('apiProvider');
    this.apiToken = document.getElementById('apiToken');
    this.tokenToggle = document.getElementById('tokenToggle');
    this.saveConfig = document.getElementById('saveConfig');
    this.clearConfig = document.getElementById('clearConfig');
    
    // Chat elements
    this.chatMessages = document.getElementById('chatMessages');
    this.chatInput = document.getElementById('chatInput');
    this.chatSend = document.getElementById('chatSend');
    this.clearChat = document.getElementById('clearChat');
    this.interruptChat = document.getElementById('interruptChat');
    
    // Checkpoint elements (will be created dynamically)
    this.checkpointPanel = null;
    this.checkpointToggle = null;
    this.checkpointList = null;
    
    // Track if request is in progress
    this.isRequestInProgress = false;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Configuration events
    this.configToggle.addEventListener('click', () => this.toggleConfig());
    this.apiProvider.addEventListener('change', (e) => this.handleProviderChange(e.target.value));
    this.tokenToggle.addEventListener('click', () => this.toggleTokenVisibility());
    this.saveConfig.addEventListener('click', () => this.saveConfiguration());
    this.clearConfig.addEventListener('click', () => this.clearConfiguration());
    
    // Chat events
    this.chatInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
    this.chatInput.addEventListener('input', () => this.updateSendButtonState());
    this.chatSend.addEventListener('click', () => this.sendMessage());
    this.clearChat.addEventListener('click', () => this.clearChatHistory());
    this.interruptChat.addEventListener('click', () => this.interruptRequest());
    
    // Fix problems button
    const fixProblemsBtn = document.getElementById('fixProblems');
    if (fixProblemsBtn) {
      fixProblemsBtn.addEventListener('click', () => this.fixProblems());
    }
    
    // Manage checkpoints button
    const manageCheckpointsBtn = document.getElementById('manageCheckpoints');
    if (manageCheckpointsBtn) {
      manageCheckpointsBtn.addEventListener('click', () => this.toggleCheckpointPanel());
    }
    
    // Auto-resize textarea
    this.chatInput.addEventListener('input', () => this.autoResizeTextarea());
  }

  /**
   * Load stored configuration on startup
   */
  async loadStoredConfiguration() {
    try {
      // Check for stored provider preference
      const storedProvider = localStorage.getItem('typedmind_chat_provider');
      if (storedProvider && (storedProvider === 'openai' || storedProvider === 'anthropic')) {
        this.currentProvider = storedProvider;
        this.apiProvider.value = storedProvider;
      }

      // Check if token exists for current provider
      const hasToken = this.tokenManager.hasToken(this.currentProvider);
      if (hasToken) {
        this.isConfigured = true;
        this.apiToken.placeholder = '••••••••••••••••••••••••••••••••';
        this.updateChatState();
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
  }

  /**
   * Load chat history from localStorage
   */
  loadChatHistory() {
    try {
      const stored = localStorage.getItem('typedmind_chat_history');
      if (stored) {
        this.conversationHistory = JSON.parse(stored);
        this.renderConversationHistory();
        // Update chat state to enable clear button if there's history
        this.updateChatState();
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  /**
   * Save chat history to localStorage
   */
  saveChatHistory() {
    try {
      localStorage.setItem('typedmind_chat_history', JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  /**
   * Toggle configuration panel visibility
   */
  toggleConfig() {
    const isVisible = this.configContent.style.display === 'block';
    this.configContent.style.display = isVisible ? 'none' : 'block';
    this.configToggle.innerHTML = isVisible ? LucideIcons.settings : LucideIcons.x;
    this.configToggle.setAttribute('aria-label', isVisible ? 'Open configuration' : 'Close configuration');
  }

  /**
   * Handle provider selection change
   */
  async handleProviderChange(provider) {
    this.currentProvider = provider;
    localStorage.setItem('typedmind_chat_provider', provider);
    
    // Check if token exists for new provider
    const hasToken = this.tokenManager.hasToken(provider);
    if (hasToken) {
      this.apiToken.placeholder = '••••••••••••••••••••••••••••••••';
      this.apiToken.value = '';
      this.isConfigured = true;
    } else {
      this.apiToken.placeholder = `Enter your ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API token`;
      this.apiToken.value = '';
      this.isConfigured = false;
    }
    
    this.updateChatState();
  }

  /**
   * Toggle token input visibility
   */
  toggleTokenVisibility() {
    const isPassword = this.apiToken.type === 'password';
    this.apiToken.type = isPassword ? 'text' : 'password';
    this.tokenToggle.innerHTML = isPassword ? LucideIcons.eyeOff : LucideIcons.eye;
    this.tokenToggle.setAttribute('aria-label', isPassword ? 'Show token' : 'Hide token');
  }

  /**
   * Save API configuration
   */
  async saveConfiguration() {
    const token = this.apiToken.value.trim();
    
    if (!token) {
      this.showError('Please enter an API token');
      return;
    }

    try {
      this.saveConfig.disabled = true;
      this.saveConfig.textContent = 'Saving...';
      
      // Test the token before saving
      const tempService = new ChatService(this.tokenManager);
      await tempService.tokenManager.encryptToken(token, this.currentProvider);
      
      const testResult = await tempService.testToken(this.currentProvider);
      
      if (!testResult.success) {
        this.showError(`Invalid API token: ${testResult.error}`);
        this.tokenManager.removeToken(this.currentProvider);
        return;
      }

      // Token is valid, save it
      await this.tokenManager.encryptToken(token, this.currentProvider);
      this.isConfigured = true;
      this.apiToken.value = '';
      this.apiToken.placeholder = '••••••••••••••••••••••••••••••••';
      
      this.showSuccess('Configuration saved successfully!');
      this.updateChatState();
      this.toggleConfig(); // Hide config panel
      
    } catch (error) {
      console.error('Configuration save error:', error);
      this.showError(`Failed to save configuration: ${error.message}`);
    } finally {
      this.saveConfig.disabled = false;
      this.saveConfig.textContent = 'Save Configuration';
    }
  }

  /**
   * Clear stored configuration
   */
  clearConfiguration() {
    this.tokenManager.removeToken(this.currentProvider);
    this.apiToken.value = '';
    this.apiToken.placeholder = `Enter your ${this.currentProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API token`;
    this.isConfigured = false;
    this.updateChatState();
    this.showSuccess('Configuration cleared');
  }

  /**
   * Update chat interface state based on configuration
   */
  updateChatState() {
    const isEnabled = this.isConfigured;
    this.chatInput.disabled = !isEnabled;
    this.chatSend.disabled = !isEnabled || !this.chatInput.value.trim();
    this.clearChat.disabled = !isEnabled || this.conversationHistory.length === 0;
    
    if (isEnabled) {
      this.chatInput.placeholder = 'Ask me anything about TypedMind or describe the architecture you want to create...';
    } else {
      this.chatInput.placeholder = 'Configure your API token above to start chatting...';
    }
  }

  /**
   * Handle input keydown events
   */
  handleInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (!this.chatSend.disabled) {
        this.sendMessage();
      }
    }
  }

  /**
   * Update send button state based on input
   */
  updateSendButtonState() {
    const hasText = this.chatInput.value.trim().length > 0;
    this.chatSend.disabled = !this.isConfigured || !hasText;
  }

  /**
   * Auto-resize textarea based on content
   */
  autoResizeTextarea() {
    this.chatInput.style.height = 'auto';
    const newHeight = Math.min(this.chatInput.scrollHeight, 150); // Max 150px
    this.chatInput.style.height = newHeight + 'px';
  }

  /**
   * Send a chat message
   */
  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message || !this.isConfigured) return;

    // Disable input during processing
    this.chatInput.disabled = true;
    this.chatSend.disabled = true;
    this.isRequestInProgress = true;
    
    // Show interrupt button
    this.interruptChat.style.display = 'inline-block';
    
    // Add user message to history
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    this.conversationHistory.push(userMessage);
    this.renderMessage(userMessage);
    this.chatInput.value = '';
    this.autoResizeTextarea();
    
    // Show typing indicator
    const typingIndicator = this.showTypingIndicator();
    
    try {
      // Get conversation history in correct format
      const formattedHistory = this.chatService.formatConversationHistory(
        this.conversationHistory.slice(0, -1), // Exclude the current message
        this.currentProvider
      );
      
      // Send message to API (sendMessage will add floating context internally)
      const response = await this.chatService.sendMessage(message, this.currentProvider, formattedHistory);
      
      // Remove typing indicator before adding response
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }
      
      // Add assistant response to history
      this.conversationHistory.push(response);
      this.renderMessage(response);
      
      // Save history
      this.saveChatHistory();
      
      // Update chat state to enable clear button
      this.updateChatState();
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Don't remove message if it was just interrupted
      if (error.message !== 'Request interrupted') {
        this.showError(`Chat error: ${error.message}`);
        // Remove user message from history if API call failed
        this.conversationHistory.pop();
      } else {
        this.showNotification('Request interrupted', 'warning');
      }
    } finally {
      // Ensure typing indicator is removed (safety check)
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }
      
      // Re-enable input and hide interrupt button
      this.chatInput.disabled = false;
      this.isRequestInProgress = false;
      this.interruptChat.style.display = 'none';
      this.updateChatState();
      this.chatInput.focus();
    }
  }

  /**
   * Render conversation history
   */
  renderConversationHistory() {
    // Keep welcome message, clear others
    const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
    this.chatMessages.innerHTML = '';
    if (welcomeMessage) {
      this.chatMessages.appendChild(welcomeMessage);
    }
    
    // Render all messages
    this.conversationHistory.forEach(message => {
      this.renderMessage(message);
    });
    
    this.scrollToBottom();
  }

  /**
   * Render a single message
   */
  renderMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${message.role}`;
    
    const timestamp = new Date(message.timestamp).toLocaleTimeString();
    
    if (message.role === 'user') {
      messageDiv.innerHTML = `
        <div class="user-avatar">${LucideIcons.user}</div>
        <div class="message-content">
          <div class="message-text">${this.escapeHtml(message.content)}</div>
          <div class="message-time">${timestamp}</div>
        </div>
      `;
    } else {
      const codeBlocks = this.chatService.extractTypedMindCode(message.content);
      const hasCode = codeBlocks.length > 0;
      const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
      const hasValidation = message.validationResult;
      const isAutoFix = message.isAutoFix;
      
      messageDiv.innerHTML = `
        <div class="assistant-avatar">${LucideIcons.cpu}</div>
        <div class="message-content">
          ${isAutoFix ? '<div class="auto-fix-badge">' + LucideIcons.wrench + ' Automatic Fix</div>' : ''}
          <div class="message-text">${this.formatMessageContent(message.content)}</div>
          ${hasCode ? this.renderCodeActions(codeBlocks) : ''}
          ${hasToolCalls ? this.renderToolCallResults(message.toolResults) : ''}
          ${hasValidation ? this.renderValidationResults(message.validationResult) : ''}
          <div class="message-time">${timestamp} • ${message.provider === 'openai' ? 'ChatGPT' : 'Claude'}${isAutoFix ? ` • Attempt ${message.autoFixAttempt}` : ''}</div>
        </div>
      `;
    }
    
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  /**
   * Render code action buttons
   */
  renderCodeActions(codeBlocks) {
    return `
      <div class="code-actions">
        ${codeBlocks.map((code, index) => `
          <button class="btn btn-small insert-code-btn" data-code="${this.escapeHtml(code)}">
            Insert Code ${codeBlocks.length > 1 ? `#${index + 1}` : ''} into Editor
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Format message content with markdown-like formatting
   */
  formatMessageContent(content) {
    // Convert code blocks to highlighted HTML
    const formatted = content
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'typedmind';
        return `<pre class="code-block" data-language="${language}"><code>${this.escapeHtml(code.trim())}</code></pre>`;
      })
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    return formatted;
  }

  /**
   * Show typing indicator
   */
  showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'chat-message typing';
    indicator.innerHTML = `
      <div class="assistant-avatar">${LucideIcons.cpu}</div>
      <div class="message-content">
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    
    this.chatMessages.appendChild(indicator);
    this.scrollToBottom();
    return indicator;
  }

  /**
   * Remove typing indicator
   */
  removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  /**
   * Clear chat history
   */
  clearChatHistory() {
    // Clear conversation history
    this.conversationHistory = [];
    localStorage.removeItem('typedmind_chat_history');
    
    // Clear checkpoint history if checkpoint manager exists
    if (window.checkpointManager) {
      window.checkpointManager.clearAllCheckpoints();
    }
    
    // Keep welcome message, clear others
    const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
    this.chatMessages.innerHTML = '';
    if (welcomeMessage) {
      this.chatMessages.appendChild(welcomeMessage);
    }
    
    // Update chat state to disable clear button
    this.updateChatState();
    
    // Show success message
    this.showNotification('Chat history cleared', 'success');
  }

  /**
   * Interrupt the current request
   */
  interruptRequest() {
    if (this.isRequestInProgress && this.chatService.interrupt()) {
      this.showNotification('Interrupting request...', 'info');
    }
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom() {
    setTimeout(() => {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }, 50);
  }
  
  /**
   * Wait for editor to be ready
   */
  async waitForEditor(maxAttempts = 20, interval = 250) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.typedMindEditor || window.editor) {
        return window.typedMindEditor || window.editor;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return null;
  }
  
  /**
   * Fix problems - manually trigger validation and auto-repair
   */
  async fixProblems() {
    // Wait for editor to be ready
    const editor = await this.waitForEditor();
    if (!editor) {
      this.showNotification('Editor not ready. Please try again in a moment.', 'error');
      return;
    }
    
    if (!window.checkpointManager) {
      // Try to initialize checkpoint manager if not ready
      if (window.CodeCheckpointManager) {
        window.checkpointManager = new window.CodeCheckpointManager();
      } else {
        this.showNotification('Checkpoint manager not ready', 'error');
        return;
      }
    }
    
    const content = editor.getValue();
    if (!content.trim()) {
      this.showNotification('No code to validate', 'warning');
      return;
    }
    
    // Run validation
    const validationResult = window.checkpointManager.validateCurrentCode();
    
    console.log('Fix Problems - Validation result:', validationResult);
    
    if (validationResult.valid) {
      this.showNotification('No problems found!', 'success');
      return;
    }
    
    // Add a user message about fixing problems with error details
    const errorDetails = validationResult.errors.map((error, i) => {
      if (typeof error === 'string') {
        return `${i + 1}. ${error}`;
      } else if (error && typeof error === 'object') {
        // Extract error message from object - handle nested structure
        let errorText = '';
        if (error.message) {
          errorText = error.message;
        } else if (error.error) {
          errorText = error.error;
        } else if (error.description) {
          errorText = error.description;
        } else if (error.text) {
          errorText = error.text;
        } else {
          // Try to extract meaningful info from the object
          try {
            const keys = Object.keys(error);
            if (keys.length > 0) {
              // Look for any string values in the object
              for (const key of keys) {
                if (typeof error[key] === 'string' && error[key].trim()) {
                  errorText = error[key];
                  break;
                }
              }
              // If no string found, create a formatted representation
              if (!errorText) {
                errorText = keys.map(key => `${key}: ${JSON.stringify(error[key])}`).join(', ');
              }
            } else {
              errorText = JSON.stringify(error);
            }
          } catch (e) {
            errorText = 'Error object could not be parsed';
          }
        }
        return `${i + 1}. ${errorText}`;
      }
      return `${i + 1}. Unknown error`;
    }).join('\n');
    
    const userMessage = {
      content: `Please fix the validation errors in the current code using the code editing tools (getCode, editCode, replaceCode).\n\nValidation errors found:\n${errorDetails}\n\nIMPORTANT: You must use the tools to edit the code directly in the editor. Do not just show code in the chat.`,
      role: 'user',
      timestamp: Date.now()
    };
    
    this.conversationHistory.push(userMessage);
    this.renderMessage(userMessage);
    
    // Show typing indicator and interrupt button
    const typingIndicator = this.showTypingIndicator();
    this.isRequestInProgress = true;
    this.interruptChat.style.display = 'inline-block';
    
    try {
      // Get the token for current provider
      const token = await this.tokenManager.decryptToken(this.currentProvider);
      if (!token) {
        throw new Error('No API token found. Please configure your API token first.');
      }
      
      // Use regular message flow to ensure floating context is included
      const formattedHistory = this.chatService.formatConversationHistory(
        this.conversationHistory.slice(0, -1), // Exclude the current message
        this.currentProvider
      );
      
      // Send message through normal flow (sendMessage will add floating context)
      const fixResponse = await this.chatService.sendMessage(
        userMessage.content,
        this.currentProvider,
        formattedHistory
      );
      
      // Remove typing indicator
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }
      
      if (fixResponse) {
        this.conversationHistory.push(fixResponse);
        this.renderMessage(fixResponse);
        this.saveChatHistory();
        this.updateChatState();
      } else {
        this.showNotification('Unable to fix problems automatically', 'error');
      }
    } catch (error) {
      console.error('Fix problems error:', error);
      // Ensure typing indicator is removed on error
      if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }
      
      if (error.message !== 'Request interrupted') {
        this.showNotification(`Error: ${error.message}`, 'error');
      } else {
        this.showNotification('Fix problems interrupted', 'warning');
      }
    } finally {
      // Hide interrupt button
      this.isRequestInProgress = false;
      this.interruptChat.style.display = 'none';
    }
  }
  
  /**
   * Toggle checkpoint panel visibility
   */
  toggleCheckpointPanel() {
    if (!window.checkpointManager) {
      this.showNotification('Checkpoint manager not available', 'error');
      return;
    }
    
    // Toggle the checkpoint panel visibility
    const panel = document.querySelector('.checkpoint-panel');
    if (panel) {
      panel.classList.toggle('hidden');
    } else {
      // If panel doesn't exist, update checkpoint display to create it
      window.checkpointManager.updateCheckpointDisplay();
      setTimeout(() => {
        const newPanel = document.querySelector('.checkpoint-panel');
        if (newPanel) {
          newPanel.classList.remove('hidden');
        }
      }, 100);
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show success message
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.chat-notification');
    existing.forEach(el => el.remove());
    
    const notification = document.createElement('div');
    notification.className = `chat-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Render tool call results
   */
  renderToolCallResults(toolResults) {
    if (!toolResults || toolResults.length === 0) return '';
    
    const successfulCalls = toolResults.filter(result => result.success);
    const failedCalls = toolResults.filter(result => !result.success);
    
    let html = '<div class="tool-results">';
    
    if (successfulCalls.length > 0) {
      if (successfulCalls.length === 1) {
        // Show specific description for single operation
        const description = successfulCalls[0].result?.description || 'Code operation completed';
        html += `<div class="tool-success">${LucideIcons.check} ${this.escapeHtml(description)}</div>`;
      } else {
        // Show summary for multiple operations
        html += `<div class="tool-success">${LucideIcons.check} Code operations completed (${successfulCalls.length}):</div>`;
        successfulCalls.forEach(result => {
          const description = result.result?.description || 'Unknown operation';
          html += `<div class="tool-success-item">• ${this.escapeHtml(description)}</div>`;
        });
      }
    }
    
    if (failedCalls.length > 0) {
      html += `<div class="tool-errors">${LucideIcons.xCircle} ${failedCalls.length} operation(s) failed:</div>`;
      failedCalls.forEach(result => {
        html += `<div class="tool-error">• ${result.error}</div>`;
      });
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Render validation results
   */
  renderValidationResults(validationResult) {
    if (!validationResult) return '';
    
    let html = '<div class="validation-results">';
    
    if (validationResult.valid) {
      html += `<div class="validation-success">${LucideIcons.check} Code validation passed`;
      if (validationResult.entities > 0) {
        html += ` (${validationResult.entities} entities found)`;
      }
      html += '</div>';
    } else {
      html += '<div class="validation-errors">' + LucideIcons.xCircle + ' Validation errors:</div>';
      validationResult.errors.forEach(error => {
        // Handle both string and object errors
        let errorText = '';
        if (typeof error === 'string') {
          errorText = error;
        } else if (error && typeof error === 'object') {
          // Try to extract error message from object
          if (error.message) {
            errorText = error.message;
          } else if (error.error) {
            errorText = error.error;
          } else if (error.description) {
            errorText = error.description;
          } else {
            // Fallback to stringifying the object
            errorText = JSON.stringify(error);
          }
        } else {
          errorText = String(error);
        }
        html += `<div class="validation-error">• ${this.escapeHtml(errorText)}</div>`;
      });
      
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        html += '<div class="validation-warnings">' + LucideIcons.alertTriangle + ' Warnings:</div>';
        validationResult.warnings.forEach(warning => {
          // Handle both string and object warnings
          let warningText = '';
          if (typeof warning === 'string') {
            warningText = warning;
          } else if (warning && typeof warning === 'object') {
            if (warning.message) {
              warningText = warning.message;
            } else if (warning.description) {
              warningText = warning.description;
            } else {
              warningText = JSON.stringify(warning);
            }
          } else {
            warningText = String(warning);
          }
          html += `<div class="validation-warning">• ${this.escapeHtml(warningText)}</div>`;
        });
      }
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Initialize checkpoint UI
   */
  initializeCheckpointUI() {
    // Create checkpoint toggle button
    this.checkpointToggle = document.createElement('button');
    this.checkpointToggle.className = 'checkpoint-toggle';
    this.checkpointToggle.innerHTML = LucideIcons.fileText;
    this.checkpointToggle.title = 'Show/Hide Code Checkpoints';
    this.checkpointToggle.setAttribute('aria-label', 'Toggle checkpoints');
    this.checkpointToggle.addEventListener('click', () => this.toggleCheckpointPanel());
    
    // Create checkpoint panel
    this.checkpointPanel = document.createElement('div');
    this.checkpointPanel.className = 'checkpoint-panel';
    this.checkpointPanel.style.display = 'none';
    
    this.checkpointPanel.innerHTML = `
      <div class="checkpoint-header">
        <h3>Code Checkpoints</h3>
        <div class="checkpoint-actions">
          <button class="btn btn-small create-checkpoint-btn">Create Manual</button>
          <button class="btn btn-small clear-checkpoints-btn">Clear All</button>
        </div>
      </div>
      <div class="checkpoint-stats"></div>
      <div class="checkpoint-list"></div>
    `;
    
    this.checkpointList = this.checkpointPanel.querySelector('.checkpoint-list');
    
    // Add event listeners
    this.checkpointPanel.querySelector('.create-checkpoint-btn').addEventListener('click', () => {
      this.createManualCheckpoint();
    });
    
    this.checkpointPanel.querySelector('.clear-checkpoints-btn').addEventListener('click', () => {
      this.clearAllCheckpoints();
    });
    
    // Insert checkpoint UI into the page
    const chatContainer = document.querySelector('.chat-container') || document.body;
    chatContainer.appendChild(this.checkpointToggle);
    chatContainer.appendChild(this.checkpointPanel);
    
    // Initial render
    this.updateCheckpointUI();
  }

  /**
   * Toggle checkpoint panel visibility
   */
  toggleCheckpointPanel() {
    const isVisible = this.checkpointPanel.style.display === 'block';
    this.checkpointPanel.style.display = isVisible ? 'none' : 'block';
    this.checkpointToggle.innerHTML = isVisible ? LucideIcons.fileText : LucideIcons.x;
    
    if (!isVisible) {
      this.updateCheckpointUI();
    }
  }

  /**
   * Update checkpoint UI display
   */
  updateCheckpointUI() {
    const stats = this.checkpointManager.getStats();
    const checkpoints = this.checkpointManager.getRecentCheckpoints(20);
    
    // Update stats
    const statsDiv = this.checkpointPanel.querySelector('.checkpoint-stats');
    statsDiv.innerHTML = `
      <div class="stats-item">Total: ${stats.total}</div>
      <div class="stats-item">AI Generated: ${stats.aiGenerated}</div>
      <div class="stats-item">Manual: ${stats.manual}</div>
      <div class="stats-item">Valid: ${stats.valid}</div>
    `;
    
    // Update checkpoint list
    this.checkpointList.innerHTML = '';
    
    if (checkpoints.length === 0) {
      this.checkpointList.innerHTML = '<div class="no-checkpoints">No checkpoints yet</div>';
      return;
    }
    
    checkpoints.forEach(checkpoint => {
      const checkpointDiv = document.createElement('div');
      checkpointDiv.className = `checkpoint-item ${checkpoint.id === stats.currentId ? 'current' : ''}`;
      
      const preview = this.checkpointManager.getCheckpointPreview(checkpoint.id, 3);
      const timestamp = new Date(checkpoint.timestamp).toLocaleString();
      const validationIcon = this.getValidationIcon(checkpoint.metadata.validationStatus);
      
      checkpointDiv.innerHTML = `
        <div class="checkpoint-header-row">
          <div class="checkpoint-description" title="${this.escapeHtml(checkpoint.description)}">
            ${validationIcon} ${this.escapeHtml(checkpoint.description)}
          </div>
          <div class="checkpoint-actions-small">
            <button class="btn btn-tiny restore-btn" data-id="${checkpoint.id}">Restore</button>
            <button class="btn btn-tiny delete-btn" data-id="${checkpoint.id}">Delete</button>
          </div>
        </div>
        <div class="checkpoint-meta">
          ${timestamp} • ${checkpoint.metadata.triggerType} • Lines: ${preview ? preview.totalLines : 0}
        </div>
        ${preview ? `
          <div class="checkpoint-preview">
            <pre><code>${this.escapeHtml(preview.preview)}</code></pre>
            ${preview.hasMore ? '<div class="preview-more">...</div>' : ''}
          </div>
        ` : ''}
      `;
      
      // Add event listeners
      checkpointDiv.querySelector('.restore-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.restoreCheckpoint(checkpoint.id);
      });
      
      checkpointDiv.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteCheckpoint(checkpoint.id);
      });
      
      this.checkpointList.appendChild(checkpointDiv);
    });
  }

  /**
   * Get validation status icon
   */
  getValidationIcon(status) {
    switch (status) {
      case 'valid': return LucideIcons.check;
      case 'invalid': return LucideIcons.xCircle;
      case 'unknown': return LucideIcons.helpCircle;
      default: return LucideIcons.circle;
    }
  }

  /**
   * Create manual checkpoint
   */
  createManualCheckpoint() {
    const description = prompt('Enter checkpoint description:', 'Manual checkpoint');
    if (description) {
      try {
        this.checkpointManager.createCheckpoint(description);
        this.updateCheckpointUI();
        this.showSuccess('Checkpoint created successfully');
      } catch (error) {
        this.showError(`Failed to create checkpoint: ${error.message}`);
      }
    }
  }

  /**
   * Restore checkpoint
   */
  restoreCheckpoint(checkpointId) {
    if (confirm('Are you sure you want to restore this checkpoint? Current changes will be lost.')) {
      try {
        this.checkpointManager.restoreCheckpoint(checkpointId);
        this.updateCheckpointUI();
        this.showSuccess('Checkpoint restored successfully');
      } catch (error) {
        this.showError(`Failed to restore checkpoint: ${error.message}`);
      }
    }
  }

  /**
   * Delete checkpoint
   */
  deleteCheckpoint(checkpointId) {
    if (confirm('Are you sure you want to delete this checkpoint?')) {
      try {
        this.checkpointManager.deleteCheckpoint(checkpointId);
        this.updateCheckpointUI();
        this.showSuccess('Checkpoint deleted successfully');
      } catch (error) {
        this.showError(`Failed to delete checkpoint: ${error.message}`);
      }
    }
  }

  /**
   * Clear all checkpoints
   */
  clearAllCheckpoints() {
    if (confirm('Are you sure you want to delete all checkpoints? This cannot be undone.')) {
      try {
        this.checkpointManager.clearAllCheckpoints();
        this.updateCheckpointUI();
        this.showSuccess('All checkpoints cleared');
      } catch (error) {
        this.showError(`Failed to clear checkpoints: ${error.message}`);
      }
    }
  }

  /**
   * Escape HTML characters
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize chat UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for other scripts to load
  setTimeout(() => {
    if (window.TokenManager && window.ChatService && window.CodeCheckpointManager) {
      window.chatUI = new ChatUI();
      
      // Handle code insertion buttons (delegated event)
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('insert-code-btn')) {
          const code = e.target.getAttribute('data-code');
          if (code && window.monaco && window.editor) {
            const unescapedCode = document.createElement('div');
            unescapedCode.innerHTML = code;
            const actualCode = unescapedCode.textContent || unescapedCode.innerText || '';
            
            // Insert code into Monaco editor
            const selection = window.editor.getSelection();
            const range = new window.monaco.Range(
              selection.startLineNumber,
              selection.startColumn,
              selection.endLineNumber,
              selection.endColumn
            );
            
            const op = {
              range: range,
              text: actualCode,
              forceMoveMarkers: true
            };
            
            window.editor.executeEdits('insert-ai-code', [op]);
            window.editor.focus();
            
            // Show success notification
            window.chatUI.showSuccess('Code inserted into editor');
          }
        }
      });
    }
  }, 100);
});

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ChatUI = ChatUI;
}