// Chat interface module

const ChatManager = {
  messagesContainer: null,
  form: null,
  input: null,
  submitBtn: null,
  isLoading: false,
  conversationHistory: [], // Track conversation for context

  init() {
    this.messagesContainer = document.getElementById('chat-messages');
    this.form = document.getElementById('chat-form');
    this.input = document.getElementById('chat-input');
    this.submitBtn = document.getElementById('chat-submit');

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Setup suggested questions
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.input.value = btn.textContent;
        this.form.dispatchEvent(new Event('submit'));
      });
    });
  },

  async handleSubmit(e) {
    e.preventDefault();

    const message = this.input.value.trim();
    if (!message || this.isLoading) return;

    // Add user message to UI and history
    this.addMessage(message, 'user');
    this.conversationHistory.push({ role: 'user', content: message });
    this.input.value = '';

    // Show loading
    this.setLoading(true);

    try {
      const response = await this.sendMessage(message);
      this.addMessage(response, 'assistant');
      // Add assistant response to history
      this.conversationHistory.push({ role: 'assistant', content: response });
    } catch (error) {
      console.error('Chat error:', error);
      this.addMessage(
        'Sorry, I encountered an error processing your request. Please try again.',
        'assistant'
      );
    } finally {
      this.setLoading(false);
    }
  },

  async sendMessage(message) {
    const context = DataManager.buildChatContext();

    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        context,
        conversationHistory: this.conversationHistory.slice(-10) // Send last 10 messages for context
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  },

  addMessage(content, role) {
    // Remove typing indicator if present
    const typingIndicator = this.messagesContainer.querySelector('.typing-indicator-container');
    if (typingIndicator) {
      typingIndicator.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Parse markdown-like formatting
    contentDiv.innerHTML = this.formatMessage(content);

    messageDiv.appendChild(contentDiv);
    this.messagesContainer.appendChild(messageDiv);

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  },

  formatMessage(text) {
    // Convert markdown-like syntax to HTML
    let html = text
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullets
      .replace(/^\s*[-•]\s+(.+)$/gm, '<li>$1</li>')
      // Numbered lists
      .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p>')
      // Single newlines within paragraphs
      .replace(/\n/g, '<br>');

    // Wrap in paragraph
    html = `<p>${html}</p>`;

    // Wrap consecutive li elements in ul
    html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');

    return html;
  },

  setLoading(loading) {
    this.isLoading = loading;
    this.submitBtn.disabled = loading;
    this.input.disabled = loading;

    if (loading) {
      // Add typing indicator
      const indicator = document.createElement('div');
      indicator.className = 'message assistant typing-indicator-container';
      indicator.innerHTML = `
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      `;
      this.messagesContainer.appendChild(indicator);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }
};

// Export for use in other modules
window.ChatManager = ChatManager;
