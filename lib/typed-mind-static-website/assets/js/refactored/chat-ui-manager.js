// ChatUIManager - Refactored chat interface with clean state management and improved UX
class ChatUIManager extends BaseUIComponent {
  constructor(services, config = {}) {
    super('chatMessages', config);
    
    this.services = services;
    this.conversationHistory = [];
    
    // DOM elements
    this.chatInput = null;
    this.chatSend = null;
    this.clearChat = null;
    this.fixProblems = null;
    this.manageCheckpoints = null;
    
    this.initialize();
  }

  getDefaultConfig() {
    return {
      maxMessageLength: 4000,
      autoSave: true,
      showTimestamps: true,
      showProviderInfo: true,
      enableMarkdown: true,
      autoScroll: true,
      typingIndicatorDelay: 100
    };
  }

  async initialize() {
    this.initializeElements();
    this.loadChatHistory();
    this.bindEvents();
    this.render();
    
    super.initialize();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.chatInput = document.getElementById('chatInput');
    this.chatSend = document.getElementById('chatSend');
    this.clearChat = document.getElementById('clearChat');
    this.fixProblems = document.getElementById('fixProblems');
    this.manageCheckpoints = document.getElementById('manageCheckpoints');
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (this.chatInput) {
      this.addDOMListener(this.chatInput, 'keydown', (e) => this.handleInputKeydown(e));
      this.addDOMListener(this.chatInput, 'input', () => {
        this.updateSendButtonState();
        this.autoResizeTextarea();
      });
    }
    
    if (this.chatSend) {
      this.addDOMListener(this.chatSend, 'click', () => this.sendMessage());
    }
    
    if (this.clearChat) {
      this.addDOMListener(this.clearChat, 'click', () => this.clearChatHistory());
    }
    
    if (this.fixProblems) {
      this.addDOMListener(this.fixProblems, 'click', () => this.fixProblems());
    }
    
    if (this.manageCheckpoints) {
      this.addDOMListener(this.manageCheckpoints, 'click', () => this.toggleCheckpointPanel());
    }

    // Handle code insertion buttons (delegated event)
    this.addDOMListener(document, 'click', (e) => {
      if (e.target.classList.contains('insert-code-btn')) {
        this.handleCodeInsertion(e.target);
      }
    });

    // Listen for configuration changes
    this.services.configurationPanel.on('configStateChanged', (state) => {
      this.updateChatState(state.isConfigured);
    });
  }

  /**
   * Load chat history from localStorage
   */
  loadChatHistory() {
    try {
      const stored = localStorage.getItem('typedmind_chat_history');
      if (stored) {
        this.conversationHistory = JSON.parse(stored);
        this.setState({ 
          hasHistory: this.conversationHistory.length > 0 
        });
        this.renderConversationHistory();
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      this.services.notificationSystem.showError('Failed to load chat history');
    }
  }

  /**
   * Save chat history to localStorage
   */
  saveChatHistory() {
    if (!this.getConfig('autoSave')) return;
    
    try {
      localStorage.setItem('typedmind_chat_history', JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.error('Failed to save chat history:', error);
      this.services.notificationSystem.showError('Failed to save chat history');
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
   * Update send button state based on input and configuration
   */
  updateSendButtonState() {
    if (!this.chatInput || !this.chatSend) return;
    
    const hasText = this.chatInput.value.trim().length > 0;
    const isConfigured = this.services.configurationPanel.isReady();
    const isEnabled = isConfigured && hasText && !this.getState().sending;
    
    this.chatSend.disabled = !isEnabled;
    
    this.setState({ 
      hasInput: hasText,
      canSend: isEnabled
    });
  }

  /**
   * Auto-resize textarea based on content
   */
  autoResizeTextarea() {
    if (!this.chatInput) return;
    
    this.chatInput.style.height = 'auto';
    const newHeight = Math.min(this.chatInput.scrollHeight, 150); // Max 150px
    this.chatInput.style.height = newHeight + 'px';
  }

  /**
   * Update chat interface state
   */
  updateChatState(isConfigured = null) {
    if (isConfigured === null) {
      isConfigured = this.services.configurationPanel.isReady();
    }
    
    const hasHistory = this.conversationHistory.length > 0;
    const isSending = this.getState().sending;
    
    // Update input state
    if (this.chatInput) {
      this.chatInput.disabled = !isConfigured || isSending;
      this.chatInput.placeholder = isConfigured ? 
        'Ask me anything about TypedMind or describe the architecture you want to create...' :
        'Configure your API token above to start chatting...';
    }
    
    // Update button states
    this.updateSendButtonState();
    
    if (this.clearChat) {
      this.clearChat.disabled = !isConfigured || !hasHistory || isSending;
    }
    
    this.setState({
      isConfigured,
      hasHistory,
      isSending
    });
  }

  /**
   * Send a chat message
   */
  async sendMessage() {
    const message = this.chatInput ? this.chatInput.value.trim() : '';
    if (!message || !this.services.configurationPanel.isReady()) return;

    // Check message length
    if (message.length > this.getConfig('maxMessageLength')) {
      this.services.notificationSystem.showError(
        `Message too long. Maximum ${this.getConfig('maxMessageLength')} characters allowed.`
      );
      return;
    }

    // Set sending state
    this.setState({ sending: true });
    this.updateChatState();
    
    // Add user message to history
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    
    this.conversationHistory.push(userMessage);
    this.renderMessage(userMessage);
    
    // Clear input
    if (this.chatInput) {
      this.chatInput.value = '';
      this.autoResizeTextarea();
    }
    
    // Show typing indicator
    const typingIndicator = this.showTypingIndicator();
    
    try {
      // Get current provider and format history
      const config = this.services.configurationPanel.getConfiguration();
      const formattedHistory = this.services.chatService.formatConversationHistory(
        this.conversationHistory.slice(0, -1), // Exclude the current message
        config.provider
      );
      
      // Send message to API
      const response = await this.services.chatService.sendMessage(
        message, 
        config.provider, 
        formattedHistory
      );
      
      // Remove typing indicator
      this.removeTypingIndicator(typingIndicator);
      
      // Add assistant response to history
      this.conversationHistory.push(response);
      this.renderMessage(response);
      
      // Save history
      this.saveChatHistory();
      
      this.emit('messageSent', { userMessage, response });
      
    } catch (error) {
      console.error('Chat error:', error);
      this.services.notificationSystem.showError(`Chat error: ${error.message}`);
      
      // Remove user message from history if API call failed
      this.conversationHistory.pop();
      
      // Remove typing indicator
      this.removeTypingIndicator(typingIndicator);
      
      this.emit('messageError', { message, error });
    } finally {
      // Reset sending state
      this.setState({ sending: false });
      this.updateChatState();
      
      if (this.chatInput) {
        this.chatInput.focus();
      }
    }
  }

  /**
   * Render conversation history
   */
  renderConversationHistory() {
    if (!this.element) return;
    
    // Keep welcome message, clear others
    const welcomeMessage = this.element.querySelector('.welcome-message');
    this.element.innerHTML = '';
    if (welcomeMessage) {
      this.element.appendChild(welcomeMessage);
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
    if (!this.element) return;
    
    const messageDiv = this.createElement('div', {
      className: `chat-message ${message.role}`
    });
    
    const timestamp = this.getConfig('showTimestamps') ? 
      new Date(message.timestamp).toLocaleTimeString() : '';
    
    if (message.role === 'user') {
      messageDiv.innerHTML = `
        <div class="user-avatar">${LucideIcons.user}</div>
        <div class="message-content">
          <div class="message-text">${this.escapeHtml(message.content)}</div>
          ${timestamp ? `<div class="message-time">${timestamp}</div>` : ''}
        </div>
      `;
    } else {
      const codeBlocks = this.services.chatService.extractTypedMindCode(message.content);
      const hasCode = codeBlocks.length > 0;
      const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
      const hasValidation = message.validationResult;
      const isAutoFix = message.isAutoFix;
      const providerInfo = this.getConfig('showProviderInfo') ? 
        `${message.provider === 'openai' ? 'ChatGPT' : 'Claude'}${isAutoFix ? ` • Attempt ${message.autoFixAttempt}` : ''}` : '';
      
      messageDiv.innerHTML = `
        <div class="assistant-avatar">${LucideIcons.cpu}</div>
        <div class="message-content">
          ${isAutoFix ? '<div class="auto-fix-badge">' + LucideIcons.wrench + ' Automatic Fix</div>' : ''}
          <div class="message-text">${this.formatMessageContent(message.content)}</div>
          ${hasCode ? this.renderCodeActions(codeBlocks) : ''}
          ${hasToolCalls ? this.renderToolCallResults(message.toolResults) : ''}
          ${hasValidation ? this.renderValidationResults(message.validationResult) : ''}
          ${timestamp ? `<div class="message-time">${timestamp}${providerInfo ? ` • ${providerInfo}` : ''}</div>` : ''}
        </div>
      `;
    }
    
    this.element.appendChild(messageDiv);
    
    if (this.getConfig('autoScroll')) {
      this.scrollToBottom();
    }
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
    if (!this.getConfig('enableMarkdown')) {
      return this.escapeHtml(content).replace(/\n/g, '<br>');
    }
    
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
    if (!this.element) return null;
    
    const indicator = this.createElement('div', {
      className: 'chat-message typing'
    });
    
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
    
    this.element.appendChild(indicator);
    
    if (this.getConfig('autoScroll')) {
      this.scrollToBottom();
    }
    
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
   * Handle code insertion from buttons
   */
  handleCodeInsertion(button) {
    const code = button.getAttribute('data-code');
    if (!code) return;
    
    if (window.monaco && window.editor) {
      const unescapedCode = this.createElement('div');
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
      
      this.services.notificationSystem.showSuccess('Code inserted into editor');
      this.emit('codeInserted', { code: actualCode });
    } else {
      this.services.notificationSystem.showError('Editor not available');
    }
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
        const description = successfulCalls[0].result?.description || 'Code operation completed';
        html += `<div class="tool-success">${LucideIcons.check} ${this.escapeHtml(description)}</div>`;
      } else {
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
        html += `<div class="tool-error">• ${this.escapeHtml(result.error)}</div>`;
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
        html += `<div class="validation-error">• ${this.escapeHtml(error)}</div>`;
      });
      
      if (validationResult.warnings && validationResult.warnings.length > 0) {
        html += '<div class="validation-warnings">' + LucideIcons.alertTriangle + ' Warnings:</div>';
        validationResult.warnings.forEach(warning => {
          html += `<div class="validation-warning">• ${this.escapeHtml(warning)}</div>`;
        });
      }
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Clear chat history
   */
  clearChatHistory() {
    if (!confirm('Are you sure you want to clear the chat history?')) {
      return;
    }
    
    // Clear conversation history
    this.conversationHistory = [];
    localStorage.removeItem('typedmind_chat_history');
    
    // Clear checkpoint history if available
    if (this.services.checkpointManager) {
      this.services.checkpointManager.clearAllCheckpoints();
    }
    
    // Keep welcome message, clear others
    if (this.element) {
      const welcomeMessage = this.element.querySelector('.welcome-message');
      this.element.innerHTML = '';
      if (welcomeMessage) {
        this.element.appendChild(welcomeMessage);
      }
    }
    
    this.setState({ hasHistory: false });
    this.updateChatState();
    this.services.notificationSystem.showSuccess('Chat history cleared');
    
    this.emit('historyCleared');
  }

  /**
   * Scroll chat to bottom
   */
  scrollToBottom() {
    if (!this.element) return;
    
    setTimeout(() => {
      this.element.scrollTop = this.element.scrollHeight;
    }, 50);
  }

  /**
   * Initialize chat interface
   */
  initializeChat() {
    this.loadChatHistory();
    this.updateChatState();
    this.emit('chatInitialized');
  }

  /**
   * Get conversation history
   */
  getConversationHistory() {
    return [...this.conversationHistory];
  }

  /**
   * Add message to history
   */
  addMessage(message) {
    this.conversationHistory.push(message);
    this.renderMessage(message);
    this.saveChatHistory();
    this.setState({ hasHistory: true });
    this.updateChatState();
  }

  render() {
    this.updateChatState();
    super.render();
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ChatUIManager = ChatUIManager;
}