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
                <li key={vibe.id} className="vibe-card">
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
              <h3>🔥 Live Preview</h3>
              <div className="code-actions">
                <button className="button secondary">Run</button>
              </div>
            </div>
            <div className="editor-container">
              <div id="preview-container" style={{height: '100%', overflow: 'auto'}}>
                <div style={{padding: '20px', textAlign: 'center', color: 'var(--text)', opacity: 0.7}}>
                  <p>Select a vibe to see a live preview</p>
                  <p style={{fontSize: '3rem', marginTop: '20px'}}>🚀</p>
                </div>
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