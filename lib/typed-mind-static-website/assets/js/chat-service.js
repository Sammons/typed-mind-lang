// Chat Service - API communication with ChatGPT and Claude
class ChatService {
  constructor(tokenManager, checkpointManager = null) {
    this.tokenManager = tokenManager;
    this.checkpointManager = checkpointManager;
    this.systemPrompt = null; // Will be loaded asynchronously
    this.grammarContent = null; // Cache grammar content
    this.tools = this.defineTools();
    this.maxRetries = 3; // For error feedback loop
    this.maxToolCallDepth = 20; // Maximum depth for tool calling loops
    this.currentToolCallDepth = 0; // Track current depth
    this.currentAbortController = null; // Track current request for interruption
    
    // Rate limit handling
    this.maxRateLimitRetries = 3; // Maximum retries for rate limit errors
    this.initialBackoffMs = 1000; // Initial backoff time in milliseconds
    this.maxBackoffMs = 60000; // Maximum backoff time (1 minute)
    
    // Load grammar and build system prompt
    this.initializeSystemPrompt();
  }

  /**
   * Initialize system prompt by loading grammar content
   */
  async initializeSystemPrompt() {
    try {
      // Try to fetch the grammar.md file
      const response = await fetch('assets/typed-mind/grammar.md');
      if (response.ok) {
        this.grammarContent = await response.text();
      }
    } catch (error) {
      console.warn('Failed to load grammar.md, using fallback grammar');
    }
    
    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Build the system prompt with TypedMind grammar documentation
   */
  buildSystemPrompt() {
    // Use the loaded grammar content if available, otherwise use fallback
    let grammarSection = this.grammarContent || this.getFallbackGrammar();
    
    // Validate grammar section doesn't contain corruption
    if (grammarSection.includes('when the AI provided a bad response')) {
      console.error('Grammar content appears to be corrupted, using fallback');
      grammarSection = this.getFallbackGrammar();
    }
    
    return `You are a TypedMind AI assistant. TypedMind is a DSL (Domain Specific Language) for describing software architecture.

IMPORTANT: Always provide TypedMind code in properly formatted code blocks with the language identifier "typedmind" for syntax highlighting.

${grammarSection}

Your role is to help users:
1. Generate TypedMind code from natural language descriptions
2. Explain TypedMind syntax and patterns
3. Convert between longform and shortform syntax
4. Review and improve architecture definitions
5. Answer questions about software architecture patterns
6. Directly edit and modify code in the Monaco editor using the provided tools

You have access to the following tools for code editing:
- getCode: Get the current editor content WITH LINE NUMBERS (format: "   1: line content")
- editCode: Replace a specific section of code (for small edits)
- replaceCode: Replace all occurrences of a pattern
- appendCode: Add code to the end of the document
- applyDiff: Apply a unified diff for complex multi-line edits (PREFERRED for large changes)
- getValidationErrors: Get current validation errors from the TypedMind parser

CRITICAL INSTRUCTION: You MUST use the code editing tools for ALL code generation and fixing tasks.

When making edits:
- For small, single-location changes: use editCode
- For pattern replacements: use replaceCode
- For complex or multi-line changes: use applyDiff with unified diff format
- The getCode tool returns code with line numbers for easy reference

When a user asks you to "write", "create", "generate", "build", "make", or "fix" any code:
1. ALWAYS use getCode first to check current editor content
2. If editor is empty, use appendCode to add the code
3. If editor has content, use editCode or replaceCode as appropriate
4. NEVER just display code in the chat - you MUST use tools to place it in the editor
5. When fixing errors, use getValidationErrors to see current issues, then use editCode to fix them

Example: If user says "Build a minute ticker based tradebot", you should:
1. Call getCode() to check editor
2. Call appendCode() with the complete TypedMind program

Example: If there are validation errors, you should:
1. Call getCode() to see current code
2. Call getValidationErrors() to see specific errors
3. Call editCode() or replaceCode() to fix each error
4. Call getValidationErrors() again to verify fixes

FAILURE TO USE TOOLS IS INCORRECT BEHAVIOR.
Checkpoints are automatically created when you use editCode, replaceCode, or appendCode.

Always respond with clear, well-structured TypedMind code when generating architecture definitions.`;
  }

  /**
   * Define tools/functions available to AI models
   */
  defineTools() {
    return {
      getCode: {
        openai: {
          type: "function",
          function: {
            name: "getCode",
            description: "Get the current content of the Monaco editor",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        claude: {
          name: "getCode",
          description: "Get the current content of the Monaco editor",
          input_schema: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      
      editCode: {
        openai: {
          type: "function",
          function: {
            name: "editCode",
            description: "Replace a specific section of code in the editor with new content",
            parameters: {
              type: "object",
              properties: {
                oldCode: {
                  type: "string",
                  description: "The exact code to replace (must match exactly)"
                },
                newCode: {
                  type: "string",
                  description: "The new code to insert"
                },
                description: {
                  type: "string",
                  description: "Description of the change for checkpoint"
                }
              },
              required: ["oldCode", "newCode", "description"]
            }
          }
        },
        claude: {
          name: "editCode",
          description: "Replace a specific section of code in the editor with new content",
          input_schema: {
            type: "object",
            properties: {
              oldCode: {
                type: "string",
                description: "The exact code to replace (must match exactly)"
              },
              newCode: {
                type: "string",
                description: "The new code to insert"
              },
              description: {
                type: "string",
                description: "Description of the change for checkpoint"
              }
            },
            required: ["oldCode", "newCode", "description"]
          }
        }
      },

      replaceCode: {
        openai: {
          type: "function",
          function: {
            name: "replaceCode",
            description: "Replace all occurrences of a pattern in the editor",
            parameters: {
              type: "object",
              properties: {
                pattern: {
                  type: "string",
                  description: "The pattern to find and replace"
                },
                replacement: {
                  type: "string",
                  description: "The replacement text"
                },
                description: {
                  type: "string",
                  description: "Description of the change for checkpoint"
                }
              },
              required: ["pattern", "replacement", "description"]
            }
          }
        },
        claude: {
          name: "replaceCode",
          description: "Replace all occurrences of a pattern in the editor",
          input_schema: {
            type: "object",
            properties: {
              pattern: {
                type: "string",
                description: "The pattern to find and replace"
              },
              replacement: {
                type: "string",
                description: "The replacement text"
              },
              description: {
                type: "string",
                description: "Description of the change for checkpoint"
              }
            },
            required: ["pattern", "replacement", "description"]
          }
        }
      },

      appendCode: {
        openai: {
          type: "function",
          function: {
            name: "appendCode",
            description: "Add code to the end of the current editor content",
            parameters: {
              type: "object",
              properties: {
                code: {
                  type: "string",
                  description: "The code to append"
                },
                description: {
                  type: "string",
                  description: "Description of the change for checkpoint"
                }
              },
              required: ["code", "description"]
            }
          }
        },
        claude: {
          name: "appendCode",
          description: "Add code to the end of the current editor content",
          input_schema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The code to append"
              },
              description: {
                type: "string",
                description: "Description of the change for checkpoint"
              }
            },
            required: ["code", "description"]
          }
        }
      },
      getValidationErrors: {
        openai: {
          type: "function",
          function: {
            name: "getValidationErrors",
            description: "Get current validation errors from the TypedMind parser",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        claude: {
          name: "getValidationErrors",
          description: "Get current validation errors from the TypedMind parser",
          input_schema: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },

      applyDiff: {
        openai: {
          type: "function",
          function: {
            name: "applyDiff",
            description: "Apply a unified diff to the code. Use this for complex multi-line edits. The diff should use standard unified diff format with line numbers.",
            parameters: {
              type: "object",
              properties: {
                diff: {
                  type: "string",
                  description: "The unified diff to apply. Format: @@ -startLine,count +startLine,count @@\\n-removed lines\\n+added lines"
                },
                description: {
                  type: "string", 
                  description: "Description of the changes for checkpoint"
                }
              },
              required: ["diff", "description"]
            }
          }
        },
        claude: {
          name: "applyDiff",
          description: "Apply a unified diff to the code. Use this for complex multi-line edits. The diff should use standard unified diff format with line numbers.",
          input_schema: {
            type: "object",
            properties: {
              diff: {
                type: "string",
                description: "The unified diff to apply. Format: @@ -startLine,count +startLine,count @@\\n-removed lines\\n+added lines"
              },
              description: {
                type: "string",
                description: "Description of the changes for checkpoint"
              }
            },
            required: ["diff", "description"]
          }
        }
      }
    };
  }

  /**
   * Add floating context (current code and validation errors) to a message
   */
  addFloatingContext(message) {
    console.log('Adding floating context to message');
    const context = [];
    
    // Get current code content if editor is available
    const editor = window.typedMindEditor || window.editor;
    if (editor) {
      const currentCode = editor.getValue();
      if (currentCode.trim()) {
        console.log('Adding current code to context, length:', currentCode.length);
        // Add code with line numbers
        const lines = currentCode.split('\n');
        const numberedCode = lines.map((line, index) => 
          `${String(index + 1).padStart(4, ' ')}: ${line}`
        ).join('\n');
        
        context.push(`--- CURRENT CODE CONTENT ---
\`\`\`typedmind
${numberedCode}
\`\`\``);
      } else {
        console.log('Editor has no content');
      }
    } else {
      console.warn('No editor available for floating context');
    }
    
    // Get current validation errors if checkpoint manager is available
    if (this.checkpointManager) {
      const validationResult = this.checkpointManager.validateCurrentCode();
      console.log('Validation result for floating context:', validationResult);
      
      if (validationResult && !validationResult.valid && validationResult.errors && validationResult.errors.length > 0) {
        console.log('Adding validation errors to context, count:', validationResult.errors.length);
        // Format validation errors properly
        const formattedErrors = validationResult.errors.map((error, i) => {
          if (typeof error === 'string') {
            return `${i + 1}. ${error}`;
          } else if (error && typeof error === 'object') {
            let errorText = '';
            let location = '';
            
            // Extract error message
            if (error.message) {
              errorText = error.message;
            } else if (error.error) {
              errorText = error.error;
            } else if (error.description) {
              errorText = error.description;
            } else if (error.text) {
              errorText = error.text;
            } else {
              errorText = 'Validation error';
            }
            
            // Extract location info if available
            if (error.line && error.column) {
              location = ` (line ${error.line}, col ${error.column})`;
            } else if (error.position && error.position.line && error.position.column) {
              location = ` (line ${error.position.line}, col ${error.position.column})`;
            }
            
            return `${i + 1}. ${errorText}${location}`;
          } else {
            return `${i + 1}. Unknown error (${typeof error})`;
          }
        }).join('\n');
        
        context.push(`--- CURRENT VALIDATION ERRORS ---
${formattedErrors}`);
      }
    }
    
    // If we have context, prepend it to the message
    if (context.length > 0) {
      const messageWithContext = `${context.join('\n\n')}\n\n--- USER MESSAGE ---\n${message}`;
      console.log('Floating context added, total message length:', messageWithContext.length);
      return messageWithContext;
    }
    
    console.log('No floating context to add');
    return message;
  }

  /**
   * Execute fetch with retry logic for rate limits
   */
  async fetchWithRetry(url, options, retryCount = 0) {
    try {
      const response = await fetch(url, options);
      
      // Check for rate limit error (429)
      if (response.status === 429) {
        if (retryCount >= this.maxRateLimitRetries) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        // Get retry-after header if available
        const retryAfter = response.headers.get('retry-after');
        let waitTime;
        
        if (retryAfter) {
          // If retry-after is provided, use it (could be seconds or HTTP date)
          waitTime = isNaN(retryAfter) ? 
            new Date(retryAfter).getTime() - Date.now() : 
            parseInt(retryAfter) * 1000;
        } else {
          // Use exponential backoff
          waitTime = Math.min(
            this.initialBackoffMs * Math.pow(2, retryCount),
            this.maxBackoffMs
          );
        }
        
        console.log(`Rate limited. Retrying after ${waitTime}ms (attempt ${retryCount + 1}/${this.maxRateLimitRetries})`);
        
        // Show notification to user
        if (window.chatUI) {
          window.chatUI.showNotification(
            `Rate limited. Retrying in ${Math.ceil(waitTime / 1000)} seconds...`,
            'warning'
          );
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry the request
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      
      return response;
    } catch (error) {
      // Re-throw abort errors without retry
      if (error.name === 'AbortError') {
        throw error;
      }
      throw error;
    }
  }

  /**
   * Send a message to the selected AI provider
   */
  async sendMessage(message, provider, conversationHistory = []) {
    try {
      // Ensure system prompt is loaded
      if (!this.systemPrompt) {
        await this.initializeSystemPrompt();
      }
      
      // Reset tool call depth for new conversation
      this.currentToolCallDepth = 0;
      
      // Create new abort controller for this request
      this.currentAbortController = new AbortController();
      
      const token = await this.tokenManager.decryptToken(provider);
      if (!token) {
        throw new Error('No API token found. Please configure your API token first.');
      }

      // Add floating context to the message
      const messageWithContext = this.addFloatingContext(message);

      if (provider === 'openai') {
        return await this.sendToOpenAI(messageWithContext, token, conversationHistory);
      } else if (provider === 'anthropic') {
        return await this.sendToClaude(messageWithContext, token, conversationHistory);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      // Check if request was aborted
      if (error.name === 'AbortError') {
        console.log('Request was interrupted by user');
        throw new Error('Request interrupted');
      }
      console.error('Chat service error:', error);
      throw error;
    } finally {
      // Clear abort controller when done
      this.currentAbortController = null;
    }
  }

  /**
   * Interrupt the current request
   */
  interrupt() {
    if (this.currentAbortController) {
      console.log('Interrupting current request...');
      this.currentAbortController.abort();
      this.currentAbortController = null;
      this.currentToolCallDepth = 0; // Reset depth counter
      return true;
    }
    return false;
  }

  /**
   * Send message to OpenAI ChatGPT
   */
  async sendToOpenAI(message, token, conversationHistory) {
    // Ensure system prompt is loaded
    if (!this.systemPrompt) {
      await this.initializeSystemPrompt();
    }
    
    // Build messages array - ensure we create a clean copy of system prompt
    const messages = [{ role: 'system', content: String(this.systemPrompt) }];
    
    // Add conversation history
    messages.push(...conversationHistory);
    
    // Only add user message if provided (for tool continuation, message might be empty)
    if (message) {
      messages.push({ role: 'user', content: message });
      // Debug: Log the user message to see if floating context is included
      console.log('Sending to OpenAI - User message:', message.substring(0, 500) + '...');
    }

    // Get tools in OpenAI format
    const tools = Object.values(this.tools).map(tool => tool.openai);

    const requestBody = {
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 4096,
      temperature: 0.7,
      stream: false,
      tools: tools,
      tool_choice: 'auto'
    };
    
    // Debug logging
    console.log('Sending to OpenAI with tools:', tools.map(t => t.function.name));

    const response = await this.fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody),
      signal: this.currentAbortController?.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API token. Please check your OpenAI API key.');
      } else if (response.status === 403) {
        throw new Error('Access denied. Please check your API key permissions.');
      } else {
        throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
      }
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const assistantMessage = data.choices[0].message;
    
    // Handle tool calls with proper agentic loop
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Execute the tool calls and get results
      const toolResults = await this.handleToolCalls(assistantMessage.tool_calls, 'openai');
      
      // Build the updated conversation with assistant message and tool results
      const updatedMessages = [...messages, assistantMessage];
      
      // Add tool results to conversation
      for (let i = 0; i < assistantMessage.tool_calls.length; i++) {
        const toolCall = assistantMessage.tool_calls[i];
        const toolResult = toolResults[i];
        
        // Format tool result message based on success/failure
        let toolResultContent;
        if (toolResult.success) {
          toolResultContent = JSON.stringify(toolResult.result);
          console.log(`Tool ${toolCall.function.name} succeeded:`, toolResult.result);
        } else {
          // Ensure error messages are properly escaped
          toolResultContent = JSON.stringify({ error: toolResult.error });
          console.error(`Tool ${toolCall.function.name} failed:`, toolResult.error);
        }
        
        updatedMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResultContent
        });
      }
      
      // Continue the conversation with tool results
      console.log('Continuing conversation after tool calls...');
      
      // Check depth to prevent infinite loops
      this.currentToolCallDepth++;
      if (this.currentToolCallDepth > this.maxToolCallDepth) {
        console.warn('Maximum tool call depth reached, stopping loop');
        this.currentToolCallDepth = 0;
        return {
          content: 'I completed the requested operations. The tool call depth limit was reached.',
          role: 'assistant',
          provider: 'openai',
          timestamp: Date.now(),
          toolCalls: assistantMessage.tool_calls,
          toolResults: toolResults
        };
      }
      
      // Make another API call with the tool results
      const continuationResponse = await this.sendToOpenAI(
        '', // Empty message as we're continuing with tool results
        token,
        updatedMessages.slice(1) // Remove system message as it's added in sendToOpenAI
      );
      
      // Reset depth counter after successful completion
      this.currentToolCallDepth = 0;
      
      // Check if code was modified and needs validation
      const codeModified = toolResults.some(result => result.codeModified);
      if (codeModified && this.checkpointManager) {
        const validationResult = this.checkpointManager.validateCurrentCode();
        continuationResponse.validationResult = validationResult;
        
        // If validation failed, attempt to fix
        if (!validationResult.valid && validationResult.errors.length > 0) {
          const fixAttempt = await this.attemptErrorFix(
            validationResult.errors,
            token,
            [...conversationHistory, assistantMessage],
            'openai'
          );
          if (fixAttempt) {
            return fixAttempt;
          }
        }
      }
      
      // Add original tool information to the response
      continuationResponse.initialToolCalls = assistantMessage.tool_calls;
      continuationResponse.initialToolResults = toolResults;
      
      return continuationResponse;
    }

    // Reset depth counter for non-tool responses
    this.currentToolCallDepth = 0;
    
    return {
      content: assistantMessage.content,
      role: 'assistant',
      provider: 'openai',
      timestamp: Date.now()
    };
  }

  /**
   * Send message to Anthropic Claude
   */
  async sendToClaude(message, token, conversationHistory) {
    // Ensure system prompt is loaded
    if (!this.systemPrompt) {
      await this.initializeSystemPrompt();
    }
    
    // Convert conversation history to Claude format
    const messages = [...conversationHistory];
    
    // Only add user message if provided (for tool continuation, message might be empty)
    if (message) {
      messages.push({ role: 'user', content: message });
    }

    // Get tools in Claude format
    const tools = Object.values(this.tools).map(tool => tool.claude);

    const requestBody = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: this.systemPrompt,
      messages: messages,
      tools: tools
    };

    const response = await this.fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': token,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody),
      signal: this.currentAbortController?.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Invalid API token. Please check your Anthropic API key.');
      } else if (response.status === 403) {
        throw new Error('Access denied. Please check your API key permissions.');
      } else {
        throw new Error(errorData.error?.message || `Claude API error: ${response.status}`);
      }
    }

    const data = await response.json();
    
    if (!data.content || !data.content.length === 0) {
      throw new Error('Invalid response format from Claude API');
    }

    // Handle tool calls in Claude response with proper agentic loop
    const toolCalls = data.content.filter(block => block.type === 'tool_use');
    const textBlocks = data.content.filter(block => block.type === 'text');
    
    if (toolCalls.length > 0) {
      // Execute the tool calls and get results
      const toolResults = await this.handleToolCalls(toolCalls, 'claude');
      
      // Build the updated conversation with assistant message containing tool calls
      const assistantMessage = {
        role: 'assistant',
        content: data.content
      };
      
      const updatedMessages = [...messages, assistantMessage];
      
      // Add tool results to conversation
      for (let i = 0; i < toolCalls.length; i++) {
        const toolCall = toolCalls[i];
        const toolResult = toolResults[i];
        
        // Format tool result for Claude
        let toolResultContent;
        if (toolResult.success) {
          toolResultContent = [
            {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: JSON.stringify(toolResult.result)
            }
          ];
        } else {
          toolResultContent = [
            {
              type: 'tool_result',
              tool_use_id: toolCall.id,
              content: JSON.stringify({ error: toolResult.error }),
              is_error: true
            }
          ];
        }
        
        updatedMessages.push({
          role: 'user',
          content: toolResultContent
        });
      }
      
      // Continue the conversation with tool results
      console.log('Continuing Claude conversation after tool calls...');
      
      // Check depth to prevent infinite loops
      this.currentToolCallDepth++;
      if (this.currentToolCallDepth > this.maxToolCallDepth) {
        console.warn('Maximum tool call depth reached, stopping loop');
        this.currentToolCallDepth = 0;
        return {
          content: textBlocks.map(block => block.text).join('\n') || 'I completed the requested operations. The tool call depth limit was reached.',
          role: 'assistant',
          provider: 'anthropic',
          timestamp: Date.now(),
          toolCalls: toolCalls,
          toolResults: toolResults
        };
      }
      
      // Make another API call with the tool results
      const continuationResponse = await this.sendToClaude(
        '', // Empty message as we're continuing with tool results
        token,
        updatedMessages.slice(1) // Remove the first user message
      );
      
      // Reset depth counter after successful completion
      this.currentToolCallDepth = 0;
      
      // Check if code was modified and needs validation
      const codeModified = toolResults.some(result => result.codeModified);
      if (codeModified && this.checkpointManager) {
        const validationResult = this.checkpointManager.validateCurrentCode();
        continuationResponse.validationResult = validationResult;
        
        // If validation failed, attempt to fix
        if (!validationResult.valid && validationResult.errors.length > 0) {
          const fixAttempt = await this.attemptErrorFix(
            validationResult.errors,
            token,
            [...conversationHistory, assistantMessage],
            'anthropic'
          );
          if (fixAttempt) {
            return fixAttempt;
          }
        }
      }
      
      // Add original tool information to the response
      continuationResponse.initialToolCalls = toolCalls;
      continuationResponse.initialToolResults = toolResults;
      continuationResponse.initialContent = textBlocks.map(block => block.text).join('\n');
      
      return continuationResponse;
    }

    // Reset depth counter for non-tool responses
    this.currentToolCallDepth = 0;
    
    return {
      content: textBlocks.map(block => block.text).join('\n'),
      role: 'assistant',
      provider: 'anthropic',
      timestamp: Date.now()
    };
  }

  /**
   * Test API token validity
   */
  async testToken(provider) {
    try {
      const testMessage = "Hello! This is a test message to verify the API connection.";
      const response = await this.sendMessage(testMessage, provider, []);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract TypedMind code blocks from a message
   */
  extractTypedMindCode(content) {
    const codeBlocks = [];
    const regex = /```(?:typedmind|tmd)?\n?([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const code = match[1].trim();
      if (code) {
        codeBlocks.push(code);
      }
    }

    return codeBlocks;
  }

  /**
   * Handle tool calls from AI responses
   */
  async handleToolCalls(toolCalls, provider) {
    const results = [];
    
    for (const toolCall of toolCalls) {
      try {
        let functionName, args;
        
        if (provider === 'openai') {
          functionName = toolCall.function.name;
          args = JSON.parse(toolCall.function.arguments);
        } else if (provider === 'claude') {
          functionName = toolCall.name;
          args = toolCall.input;
        }
        
        // Show tool action in chat UI
        this.showToolAction(functionName, args);
        
        const result = await this.executeToolFunction(functionName, args);
        results.push({
          toolCall: toolCall,
          result: result,
          success: true,
          codeModified: ['editCode', 'replaceCode', 'appendCode'].includes(functionName)
        });
        
      } catch (error) {
        console.error(`Tool execution error for ${toolCall.function?.name || toolCall.name}:`, error);
        results.push({
          toolCall: toolCall,
          error: error.message,
          success: false,
          codeModified: false
        });
      }
    }
    
    return results;
  }

  /**
   * Execute a specific tool function
   */
  async executeToolFunction(functionName, args) {
    const editor = window.typedMindEditor || window.editor;
    if (!editor) {
      throw new Error('Monaco editor not available');
    }

    switch (functionName) {
      case 'getCode':
        const content = editor.getValue();
        const lines = content.split('\n');
        const numberedContent = lines.map((line, index) => 
          `${String(index + 1).padStart(4, ' ')}: ${line}`
        ).join('\n');
        
        return {
          content: numberedContent,
          lineCount: lines.length,
          rawContent: content
        };

      case 'editCode':
        return this.executeEditCode(args);

      case 'replaceCode':
        return this.executeReplaceCode(args);

      case 'appendCode':
        return this.executeAppendCode(args);

      case 'getValidationErrors':
        return this.executeGetValidationErrors();

      case 'applyDiff':
        return this.executeApplyDiff(args);

      default:
        throw new Error(`Unknown tool function: ${functionName}`);
    }
  }

  /**
   * Execute edit code operation
   */
  executeEditCode(args) {
    const { oldCode, newCode, description } = args;
    const editor = window.typedMindEditor || window.editor;
    const currentCode = editor.getValue();
    
    if (!currentCode.includes(oldCode)) {
      throw new Error('Old code not found in editor content');
    }

    // Create checkpoint before editing
    if (this.checkpointManager) {
      this.checkpointManager.createCheckpoint(`Before edit: ${description}`, {
        triggerType: 'ai_edit_before',
        operationType: 'edit'
      });
    }

    const newContent = currentCode.replace(oldCode, newCode);
    editor.setValue(newContent);

    // Create checkpoint after editing
    if (this.checkpointManager) {
      this.checkpointManager.createAICheckpoint(`AI Edit: ${description}`, 'current', 'edit');
    }

    return {
      success: true,
      description: description,
      linesChanged: newCode.split('\n').length - oldCode.split('\n').length
    };
  }

  /**
   * Execute replace code operation
   */
  executeReplaceCode(args) {
    const { pattern, replacement, description } = args;
    const editor = window.typedMindEditor || window.editor;
    const currentCode = editor.getValue();
    
    // Create checkpoint before replacing
    if (this.checkpointManager) {
      this.checkpointManager.createCheckpoint(`Before replace: ${description}`, {
        triggerType: 'ai_edit_before',
        operationType: 'replace'
      });
    }

    const regex = new RegExp(pattern, 'g');
    const matches = currentCode.match(regex);
    const newContent = currentCode.replace(regex, replacement);
    
    editor.setValue(newContent);

    // Create checkpoint after replacing
    if (this.checkpointManager) {
      this.checkpointManager.createAICheckpoint(`AI Replace: ${description}`, 'current', 'replace');
    }

    return {
      success: true,
      description: description,
      replacementCount: matches ? matches.length : 0
    };
  }

  /**
   * Execute append code operation
   */
  executeAppendCode(args) {
    const { code, description } = args;
    const editor = window.typedMindEditor || window.editor;
    const currentCode = editor.getValue();
    
    // Create checkpoint before appending
    if (this.checkpointManager) {
      this.checkpointManager.createCheckpoint(`Before append: ${description}`, {
        triggerType: 'ai_edit_before',
        operationType: 'append'
      });
    }

    const newContent = currentCode + (currentCode.endsWith('\n') ? '' : '\n') + code;
    editor.setValue(newContent);

    // Create checkpoint after appending
    if (this.checkpointManager) {
      this.checkpointManager.createAICheckpoint(`AI Append: ${description}`, 'current', 'append');
    }

    return {
      success: true,
      description: description,
      linesAdded: code.split('\n').length
    };
  }

  /**
   * Execute get validation errors operation
   */
  executeGetValidationErrors() {
    if (!this.checkpointManager) {
      return {
        valid: true,
        errors: [],
        message: 'Validation not available'
      };
    }

    const validationResult = this.checkpointManager.validateCurrentCode();
    
    return {
      valid: validationResult.valid,
      errors: validationResult.errors || [],
      warnings: validationResult.warnings || [],
      errorCount: validationResult.errors ? validationResult.errors.length : 0,
      warningCount: validationResult.warnings ? validationResult.warnings.length : 0,
      message: validationResult.valid 
        ? 'No validation errors found' 
        : `Found ${validationResult.errors.length} error(s) and ${validationResult.warnings ? validationResult.warnings.length : 0} warning(s)`
    };
  }

  /**
   * Execute apply diff operation
   */
  executeApplyDiff(args) {
    const { diff, description } = args;
    const editor = window.typedMindEditor || window.editor;
    const currentCode = editor.getValue();
    const lines = currentCode.split('\n');
    
    // Create checkpoint before applying diff
    if (this.checkpointManager) {
      this.checkpointManager.createCheckpoint(`Before diff: ${description}`, {
        triggerType: 'ai_diff_before',
        diffApplied: diff
      });
    }

    try {
      // Parse the diff and apply changes
      const newLines = this.applyUnifiedDiff(lines, diff);
      const newCode = newLines.join('\n');
      
      // Update editor content
      editor.setValue(newCode);
      
      // Create checkpoint after successful diff
      if (this.checkpointManager) {
        this.checkpointManager.createCheckpoint(`After diff: ${description}`, {
          triggerType: 'ai_diff_after',
          diffApplied: diff
        });
      }
      
      return {
        success: true,
        message: 'Diff applied successfully',
        linesModified: this.countDiffLines(diff)
      };
    } catch (error) {
      throw new Error(`Failed to apply diff: ${error.message}`);
    }
  }

  /**
   * Apply a unified diff to an array of lines
   */
  applyUnifiedDiff(lines, diff) {
    const result = [...lines];
    const chunks = this.parseDiffChunks(diff);
    
    // Apply chunks in reverse order to maintain line numbers
    for (let i = chunks.length - 1; i >= 0; i--) {
      const chunk = chunks[i];
      const startLine = chunk.oldStart - 1; // Convert to 0-based index
      
      // Remove old lines
      result.splice(startLine, chunk.oldCount);
      
      // Insert new lines
      result.splice(startLine, 0, ...chunk.newLines);
    }
    
    return result;
  }

  /**
   * Parse diff into chunks
   */
  parseDiffChunks(diff) {
    const chunks = [];
    const lines = diff.split('\n');
    let currentChunk = null;
    
    for (const line of lines) {
      // Parse chunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const headerMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (headerMatch) {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = {
          oldStart: parseInt(headerMatch[1]),
          oldCount: parseInt(headerMatch[2] || '1'),
          newStart: parseInt(headerMatch[3]),
          newCount: parseInt(headerMatch[4] || '1'),
          oldLines: [],
          newLines: []
        };
      } else if (currentChunk) {
        if (line.startsWith('-')) {
          currentChunk.oldLines.push(line.substring(1));
        } else if (line.startsWith('+')) {
          currentChunk.newLines.push(line.substring(1));
        }
        // Context lines (starting with space) are ignored
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Count the number of lines modified in a diff
   */
  countDiffLines(diff) {
    const lines = diff.split('\n');
    let added = 0;
    let removed = 0;
    
    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added++;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removed++;
      }
    }
    
    return { added, removed, total: added + removed };
  }

  /**
   * Attempt to fix validation errors with AI feedback loop
   */
  async attemptErrorFix(errors, token, conversationHistory, provider, attempt = 1) {
    if (attempt > this.maxRetries) {
      console.log('Max retry attempts reached for error fixing');
      return null;
    }
    
    // Debug log to see error format
    console.log('Attempting to fix errors:', errors);

    // Format errors properly - handle both string and object errors
    const formattedErrors = errors.map((error, i) => {
      if (typeof error === 'string') {
        return `${i + 1}. ${error}`;
      } else if (error && typeof error === 'object') {
        // Handle error objects with different properties
        let errorText = '';
        let location = '';
        
        // Extract error message
        if (error.message) {
          errorText = error.message;
        } else if (error.error) {
          errorText = error.error;
        } else if (error.description) {
          errorText = error.description;
        } else if (error.text) {
          errorText = error.text;
        } else {
          // If no message field, it might be a browser parser error format
          errorText = 'Validation error';
        }
        
        // Extract location info if available
        if (error.line && error.column) {
          location = ` (line ${error.line}, col ${error.column})`;
        } else if (error.position && error.position.line && error.position.column) {
          location = ` (line ${error.position.line}, col ${error.position.column})`;
        }
        
        return `${i + 1}. ${errorText}${location}`;
      } else {
        return `${i + 1}. Unknown error (${typeof error})`;
      }
    }).join('\n');
    
    const errorMessage = `The code changes resulted in validation errors. Please fix these issues:\n\n${formattedErrors}\n\nPlease use the appropriate tools to correct these issues.`;
    
    // Add floating context to the error message
    const messageWithContext = this.addFloatingContext(errorMessage);
    
    try {
      // Call the low-level API methods directly to avoid recursion
      let fixResponse;
      if (provider === 'openai') {
        fixResponse = await this.sendToOpenAI(messageWithContext, token, conversationHistory);
      } else if (provider === 'anthropic') {
        fixResponse = await this.sendToClaude(messageWithContext, token, conversationHistory);
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      
      // If the fix attempt also has validation errors, retry
      if (fixResponse.validationResult && !fixResponse.validationResult.valid) {
        const newHistory = [...conversationHistory, { role: 'user', content: messageWithContext }];
        // Add the assistant response to history for next attempt
        newHistory.push({
          role: 'assistant',
          content: fixResponse.content,
          timestamp: fixResponse.timestamp
        });
        
        return await this.attemptErrorFix(
          fixResponse.validationResult.errors,
          token,
          newHistory,
          provider,
          attempt + 1
        );
      }
      
      // Mark the response as an automatic fix
      fixResponse.isAutoFix = true;
      fixResponse.autoFixAttempt = attempt;
      
      // Enhance the content to indicate this was an automatic fix
      const originalContent = fixResponse.content || '';
      fixResponse.content = attempt === 1 
        ? `I detected validation errors and automatically fixed them.\n\n${originalContent}`
        : `After ${attempt} attempts, I successfully fixed the validation errors.\n\n${originalContent}`;
      
      return fixResponse;
    } catch (error) {
      console.error(`Error fix attempt ${attempt} failed:`, error);
      return null;
    }
  }

  /**
   * Get conversation history in the format expected by each provider
   */
  formatConversationHistory(history, provider) {
    if (provider === 'openai') {
      return history.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    } else if (provider === 'anthropic') {
      // Claude expects alternating user/assistant messages
      return history
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
    }
    return [];
  }

  /**
   * Show tool action in chat UI
   */
  showToolAction(functionName, args) {
    if (!window.chatUI) return;
    
    // Create a descriptive message based on the tool and arguments
    let description = '';
    
    switch (functionName) {
      case 'getCode':
        description = LucideIcons.bookOpen + ' Reading current editor content...';
        break;
      case 'editCode':
        description = LucideIcons.pencil + ` Editing code: ${args.description || 'Making changes...'}`;
        break;
      case 'replaceCode':
        description = LucideIcons.refreshCw + ` Replacing code: ${args.description || 'Updating code...'}`;
        break;
      case 'appendCode':
        description = LucideIcons.fileText + ` Appending code: ${args.description || 'Adding new code...'}`;
        break;
      case 'getValidationErrors':
        description = LucideIcons.search + ' Checking for validation errors...';
        break;
      case 'applyDiff':
        description = LucideIcons.gitMerge + ` Applying diff: ${args.description || 'Making complex changes...'}`;
        break;
      default:
        description = LucideIcons.wrench + ` Executing ${functionName}...`;
    }
    
    // Add tool action message to chat
    const toolActionMessage = {
      role: 'system',
      content: description,
      isToolAction: true,
      timestamp: Date.now()
    };
    
    // Render the tool action in the chat
    this.renderToolAction(toolActionMessage);
  }
  
  /**
   * Render tool action in chat UI
   */
  renderToolAction(message) {
    if (!window.chatUI || !window.chatUI.chatMessages) return;
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'tool-action-message';
    actionDiv.innerHTML = `
      <div class="tool-action-content">
        <div class="tool-action-icon">${LucideIcons.settings}</div>
        <div class="tool-action-text">${message.content}</div>
        <div class="tool-action-spinner"></div>
      </div>
    `;
    
    window.chatUI.chatMessages.appendChild(actionDiv);
    window.chatUI.scrollToBottom();
    
    // Remove the action message after a short delay
    setTimeout(() => {
      if (actionDiv.parentNode) {
        actionDiv.classList.add('fade-out');
        setTimeout(() => {
          if (actionDiv.parentNode) {
            actionDiv.parentNode.removeChild(actionDiv);
          }
        }, 300);
      }
    }, 2000);
  }

  /**
   * Get fallback grammar content when grammar.md cannot be loaded
   */
  getFallbackGrammar() {
    return `## TypedMind DSL Grammar Reference

TypedMind supports both longform and shortform syntax for describing software architecture.

### Entity Types:
- **Program**: Defines an application entry point
- **File**: Defines a source code file
- **Function**: Defines a function with its type signature  
- **Class**: Defines a class with inheritance
- **Constants**: Defines a constants/configuration file
- **DTO**: Defines a Data Transfer Object
- **Asset**: Defines a static asset
- **UIComponent**: Defines a UI component (&! for root)
- **RunParameter**: Defines a runtime parameter
- **Dependency**: Defines an external dependency

### Shortform Syntax Patterns:
- Program: \`Name -> EntryPoint [Purpose] [Version]\`
- File: \`Name @ path:\`
- Function: \`Name :: Signature\`
- Class: \`Name <: BaseClass[, Interface1, Interface2]\`
- Constants: \`Name ! path [: Schema]\`
- Asset: \`Name ~ Description\`
- UI Component: \`Name & Description\` | \`Name &! Description\` (root)
- Run Parameter: \`Name $type Description [(required)]\`
- Dependency: \`Name ^ Purpose [Version]\`

### Continuation Patterns:
- Imports: \`<- [Database, UserModel]\`
- Exports: \`-> [createUser, getUser]\`
- Calls: \`~> [validate, save]\`
- Input: \`<- UserCreateDTO\`
- Output: \`-> UserDTO\`
- Methods: \`=> [create, read, update]\`
- Affects: \`~ [UserList, UserForm]\`
- Contains: \`> [Header, Footer]\`
- Contained By: \`< [Dashboard]\`
- DTO Field: \`- name: string "User name"\`
- Comment: \`# This is a comment\`
- Description: \`"Creates a new user"\`
- Default Value: \`= "default-value"\`
- Consumes: \`$< [DATABASE_URL, API_KEY]\`

### Example TypedMind Code:

\`\`\`typedmind
# Todo Application Architecture
TodoApp -> AppEntry "Main todo application" v1.0.0

# Data Models
UserService @ src/services/user.ts:
  <- [Database, UserModel]
  -> [createUser, getUser, updateUser]
  "Handles user business logic"

createUser :: (data: UserCreateDTO) => Promise<User>
  "Creates a new user in the database"
  <- UserCreateDTO
  -> User
  ~> [validateUser, Database.insert, sendWelcomeEmail]
  ~ [UserList, UserCount]
  $< [DATABASE_URL, SMTP_HOST]

UserCreateDTO % "Data for creating a new user"
  - name: string "User full name"
  - email: string "User email address"
  - password: string "User password (will be hashed)"
  - age?: number "User age (optional)"

App &! "Root application component"
  > [Header, MainContent, Footer]

UserList & "Displays list of users"
  < [MainContent]
  > [UserCard]

DATABASE_URL $env "PostgreSQL connection string" (required)
SMTP_HOST $env "Email server host"
  = "localhost"

express ^ "Web framework" v4.18.0
@types/node ^ "Node.js type definitions" v20.0.0
\`\`\``;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.ChatService = ChatService;
}