import { CONFIG } from './config.js';

// Initialize connection
const room = new WebsimSocket();

// Root component
const App = () => {
  const [activeTab, setActiveTab] = React.useState('vibes');
  const [newVibe, setNewVibe] = React.useState({
    title: '',
    description: '',
    code: '',
    language: CONFIG.defaultLanguage,
    tags: []
  });
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [selectedVibe, setSelectedVibe] = React.useState(null);

  // Get peers using React's useSyncExternalStore
  const peers = React.useSyncExternalStore(
    room.party.subscribe,
    () => room.party.peers
  );

  // Get vibes using React's useSyncExternalStore
  const vibes = React.useSyncExternalStore(
    room.collection('vibe').subscribe,
    room.collection('vibe').getList
  );

  // Get upvotes
  const upvotes = React.useSyncExternalStore(
    room.collection('upvote').subscribe,
    room.collection('upvote').getList
  );

  // Function to handle creating a new vibe
  const handleCreateVibe = async (e) => {
    e.preventDefault();

    if (!newVibe.title || !newVibe.code) {
      alert('Please provide a title and code for your vibe!');
      return;
    }

    try {
      await room.collection('vibe').create({
        title: newVibe.title,
        description: newVibe.description,
        code: newVibe.code,
        language: newVibe.language,
        tags: newVibe.tags
      });

      // Reset form
      setNewVibe({
        title: '',
        description: '',
        code: '',
        language: CONFIG.defaultLanguage,
        tags: []
      });

      // Switch to vibes tab
      setActiveTab('vibes');
    } catch (error) {
      console.error('Failed to create vibe:', error);
      alert('Failed to create vibe. Please try again.');
    }
  };

  // Function to generate code using LLM
  const generateCode = async () => {
    if (!newVibe.description) {
      alert('Please provide a description of what you want to create!');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Generate ${newVibe.language} code based on this description: ${newVibe.description}
      The code should be clean, well-commented, and follow best practices.
      Only output the code, no explanations needed.`;

      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      });

      setNewVibe({
        ...newVibe,
        code: completion.content.trim()
      });
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('Failed to generate code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to toggle upvote
  const toggleUpvote = async (vibeId) => {
    // Check if user has already upvoted this vibe
    const existingUpvote = upvotes.find(upvote => 
      upvote.vibe_id === vibeId && 
      upvote.username === room.party.client.username
    );

    try {
      if (existingUpvote) {
        // Remove upvote if already upvoted
        await room.collection('upvote').delete(existingUpvote.id);
      } else {
        // Add upvote
        await room.collection('upvote').create({
          vibe_id: vibeId
        });
      }
    } catch (error) {
      console.error('Failed to toggle upvote:', error);
    }
  };

  // Function to count upvotes for a vibe
  const countUpvotes = (vibeId) => {
    return upvotes.filter(upvote => upvote.vibe_id === vibeId).length;
  };

  // Function to check if current user has upvoted a vibe
  const hasUpvoted = (vibeId) => {
    return upvotes.some(upvote => 
      upvote.vibe_id === vibeId && 
      upvote.username === room.party.client.username
    );
  };

  // Toggle tag selection
  const toggleTag = (tag) => {
    if (newVibe.tags.includes(tag)) {
      setNewVibe({
        ...newVibe,
        tags: newVibe.tags.filter(t => t !== tag)
      });
    } else {
      setNewVibe({
        ...newVibe,
        tags: [...newVibe.tags, tag]
      });
    }
  };

  // Function to run code in sandbox
  const runCodeInSandbox = (code, language) => {
    const previewContainer = document.getElementById('preview-container');
    
    // Clear previous content
    previewContainer.innerHTML = '';
    
    if (!code) return;
    
    try {
      if (language === 'javascript') {
        // Create sandbox iframe
        const sandboxFrame = document.createElement('iframe');
        sandboxFrame.style.width = '100%';
        sandboxFrame.style.height = '100%';
        sandboxFrame.style.border = 'none';
        sandboxFrame.sandbox = 'allow-scripts';
        previewContainer.appendChild(sandboxFrame);
        
        // Add content to iframe
        const frameContent = `
          <html>
            <head>
              <style>body { margin: 0; padding: 10px; color: white; font-family: sans-serif; }</style>
            </head>
            <body>
              <div id="output"></div>
              <script>
                // Capture console output
                const output = document.getElementById('output');
                const originalConsole = console;
                console = {
                  log: function(...args) {
                    originalConsole.log(...args);
                    const logElement = document.createElement('div');
                    logElement.textContent = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
                    output.appendChild(logElement);
                  },
                  error: function(...args) {
                    originalConsole.error(...args);
                    const logElement = document.createElement('div');
                    logElement.style.color = 'red';
                    logElement.textContent = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
                    output.appendChild(logElement);
                  }
                };

                try {
                  ${code}
                } catch(error) {
                  console.error('Error:', error.message);
                }
              </script>
            </body>
          </html>
        `;
        
        sandboxFrame.srcdoc = frameContent;
      } else if (language === 'html') {
        // For HTML, render directly
        const sandboxFrame = document.createElement('iframe');
        sandboxFrame.style.width = '100%';
        sandboxFrame.style.height = '100%';
        sandboxFrame.style.border = 'none';
        sandboxFrame.sandbox = 'allow-scripts';
        previewContainer.appendChild(sandboxFrame);
        
        sandboxFrame.srcdoc = code;
      } else if (language === 'css') {
        // For CSS, create a demo with some elements
        const sandboxFrame = document.createElement('iframe');
        sandboxFrame.style.width = '100%';
        sandboxFrame.style.height = '100%';
        sandboxFrame.style.border = 'none';
        previewContainer.appendChild(sandboxFrame);
        
        const frameContent = `
          <html>
            <head>
              <style>${code}</style>
            </head>
            <body>
              <div class="container">
                <h1>CSS Preview</h1>
                <p>This is paragraph text</p>
                <button>Button Element</button>
                <div class="box">Div with class "box"</div>
              </div>
            </body>
          </html>
        `;
        
        sandboxFrame.srcdoc = frameContent;
      } else if (language === 'python') {
        // For Python, show message that it can't be executed in browser
        const messageDiv = document.createElement('div');
        messageDiv.style.padding = '20px';
        messageDiv.style.color = 'var(--text)';
        messageDiv.style.textAlign = 'center';
        messageDiv.innerHTML = `<p>Python code can't be executed directly in the browser.</p>
                               <pre style="text-align: left; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px;">${escapeHtml(code)}</pre>`;
        previewContainer.appendChild(messageDiv);
      } else if (language === 'react') {
        // For React, create sandbox with React imported
        const sandboxFrame = document.createElement('iframe');
        sandboxFrame.style.width = '100%';
        sandboxFrame.style.height = '100%';
        sandboxFrame.style.border = 'none';
        sandboxFrame.sandbox = 'allow-scripts';
        previewContainer.appendChild(sandboxFrame);
        
        const frameContent = `
          <html>
            <head>
              <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
              <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
              <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
              <style>body { margin: 0; padding: 10px; color: white; font-family: sans-serif; }</style>
            </head>
            <body>
              <div id="root"></div>
              <div id="error" style="color: red;"></div>
              <script type="text/babel">
                try {
                  ${code}
                } catch(error) {
                  document.getElementById('error').textContent = 'Error: ' + error.message;
                }
              </script>
            </body>
          </html>
        `;
        
        sandboxFrame.srcdoc = frameContent;
      }
    } catch (error) {
      console.error('Error running code:', error);
      const errorDiv = document.createElement('div');
      errorDiv.textContent = `Error: ${error.message}`;
      errorDiv.style.color = 'var(--error)';
      errorDiv.style.padding = '20px';
      previewContainer.appendChild(errorDiv);
    }
  };

  // Helper function to escape HTML for display
  const escapeHtml = (unsafe) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  return (
    <React.Fragment>
      <header className="header">
        <div className="title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" fill="currentColor"/>
          </svg>
          {CONFIG.title}
        </div>
        <div className="presence-list">
          {Object.entries(peers).map(([clientId, peer]) => (
            <div key={clientId} className="presence-avatar" title={peer.username}>
              <img src={`https://images.websim.ai/avatar/${peer.username}`} alt={peer.username} />
              <div className="presence-indicator"></div>
            </div>
          ))}
        </div>
      </header>

      <div className="main-content">
        <div className="lobby-container">
          <div className="code-toolbar">
            <div className="code-tabs">
              <button 
                className={`button ${activeTab === 'vibes' ? '' : 'secondary'}`} 
                onClick={() => setActiveTab('vibes')}
              >
                Vibes ({vibes.length})
              </button>
              <button 
                className={`button ${activeTab === 'create' ? '' : 'secondary'}`} 
                onClick={() => setActiveTab('create')}
              >
                Create New
              </button>
            </div>
          </div>

          {activeTab === 'create' && (
            <form onSubmit={handleCreateVibe}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={newVibe.title}
                  onChange={(e) => setNewVibe({...newVibe, title: e.target.value})}
                  maxLength="100"
                  placeholder="Give your code a catchy title"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-textarea"
                  value={newVibe.description}
                  onChange={(e) => setNewVibe({...newVibe, description: e.target.value})}
                  maxLength="500"
                  placeholder="Describe what your code does or what you want to generate"
                />
                <div style={{marginTop: '10px', textAlign: 'right'}}>
                  <button 
                    type="button" 
                    className="button secondary"
                    onClick={generateCode}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : '✨ Generate Code'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Language</label>
                <select 
                  className="form-input"
                  value={newVibe.language}
                  onChange={(e) => setNewVibe({...newVibe, language: e.target.value})}
                >
                  {CONFIG.supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Code</label>
                <textarea 
                  className="form-textarea code-input"
                  value={newVibe.code}
                  onChange={(e) => setNewVibe({...newVibe, code: e.target.value})}
                  maxLength={CONFIG.maxCodeLength}
                  placeholder={`Your ${newVibe.language} code will appear here after generation, or paste your own`}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tags</label>
                <div className="vibe-tags" style={{marginBottom: '10px'}}>
                  {CONFIG.availableTags.map(tag => (
                    <button 
                      key={tag}
                      type="button"
                      className={`vibe-tag ${newVibe.tags.includes(tag) ? 'active' : ''}`}
                      style={{
                        opacity: newVibe.tags.includes(tag) ? 1 : 0.6,
                        cursor: 'pointer',
                        border: 'none',
                      }}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" className="button">Share Vibe ✨</button>
            </form>
          )}

          {activeTab === 'vibes' && vibes.length === 0 && (
            <div className="empty-state">
              <div className="emoji">{CONFIG.emptyStateEmoji}</div>
              <p>{CONFIG.emptyStateMessage}</p>
              <button 
                className="button" 
                onClick={() => setActiveTab('create')}
              >
                Share Your First Vibe
              </button>
            </div>
          )}

          {activeTab === 'vibes' && vibes.length > 0 && (
            <ul className="vibe-list">
              {[...vibes].reverse().map(vibe => (
                <li 
                  key={vibe.id} 
                  className={`vibe-card ${selectedVibe?.id === vibe.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedVibe(vibe);
                    runCodeInSandbox(vibe.code, vibe.language);
                  }}
                >
                  <div className="vibe-header">
                    <div className="vibe-user">
                      <div className="user-avatar">
                        <img src={`https://images.websim.ai/avatar/${vibe.username}`} alt={vibe.username} />
                      </div>
                      <div>
                        <strong>{vibe.title}</strong>
                        <div>by {vibe.username}</div>
                      </div>
                    </div>
                    <div className="vibe-actions">
                      <div className="voting">
                        <button 
                          className={`vote-btn ${hasUpvoted(vibe.id) ? 'active' : ''}`}
                          onClick={() => toggleUpvote(vibe.id)}
                        >
                          ⭐
                        </button>
                        <span className="vote-count">{countUpvotes(vibe.id)}</span>
                      </div>
                    </div>
                  </div>

                  {vibe.description && (
                    <div className="vibe-description">{vibe.description}</div>
                  )}

                  <pre className="vibe-code">{vibe.code}</pre>

                  <div className="vibe-meta">
                    <div>
                      {new Date(vibe.created_at).toLocaleDateString()}
                    </div>
                    {vibe.tags && vibe.tags.length > 0 && (
                      <div className="vibe-tags">
                        {vibe.tags.map(tag => (
                          <span key={tag} className="vibe-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="vibe-container">
          <div className="code-editor">
            <div className="code-toolbar">
              <h3>🔥 Live Preview {selectedVibe && `- ${selectedVibe.title}`}</h3>
              <div className="code-actions">
                {selectedVibe && (
                  <button 
                    className="button secondary"
                    onClick={() => runCodeInSandbox(selectedVibe.code, selectedVibe.language)}
                  >
                    Run
                  </button>
                )}
              </div>
            </div>
            <div className="editor-container">
              <div id="preview-container" style={{height: '100%', overflow: 'auto'}}>
                {!selectedVibe && (
                  <div style={{padding: '20px', textAlign: 'center', color: 'var(--text)', opacity: 0.7}}>
                    <p>Select a vibe to see a live preview</p>
                    <p style={{fontSize: '3rem', marginTop: '20px'}}>🚀</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

// Render the app
ReactDOM.createRoot(document.getElementById('app')).render(<App />);