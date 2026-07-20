import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import {
  Archive,
  ArrowRight,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  File,
  FileImage,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Mic,
  Moon,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react'

type UploadedFile = {
  id: string
  name: string
  detail: string
  kind: 'pdf' | 'image' | 'email' | 'other'
  previewUrl?: string
  serverUrl?: string
  status: 'analyzed' | 'uploading' | 'uploaded' | 'error'
}

const recentRfis = [
  { id: 'RFI-087', title: 'Ceiling framing at Corridor 2', project: 'Mason Health Center', active: true },
  { id: 'RFI-086', title: 'Electrical room door clearance', project: 'Mason Health Center' },
  { id: 'RFI-085', title: 'Slab edge at Grid Line F', project: 'Mason Health Center' },
  { id: 'RFI-042', title: 'Lobby storefront head detail', project: 'Riverside Commons' },
]

const defaultFiles: UploadedFile[] = [
  { id: 'sample-email', name: 'RE_ Corridor ceiling conflict.eml', detail: 'Email · 284 KB', kind: 'email', status: 'analyzed' },
  { id: 'sample-image', name: 'IMG_2847.jpg', detail: 'Photo · 2.4 MB', kind: 'image', status: 'analyzed' },
  { id: 'sample-drawing', name: 'A401_Level 2 RCP.pdf', detail: 'Drawing · 4.1 MB', kind: 'pdf', status: 'analyzed' },
]

type UploadResponse = {
  files: Array<{
    url: string
  }>
  error?: string
}

const fileIcon = (kind: UploadedFile['kind']) => {
  if (kind === 'image') return <FileImage size={17} />
  if (kind === 'email') return <MessageSquareText size={17} />
  return <FileText size={17} />
}

function App() {
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [activeMobilePanel, setActiveMobilePanel] = useState<'workspace' | 'chat'>('workspace')
  const [files, setFiles] = useState<UploadedFile[]>(defaultFiles)
  const [isDragging, setIsDragging] = useState(false)
  const [recording, setRecording] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(true)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'I reviewed the email, field photo, and reflected ceiling plan together. The source material indicates a conflict between the corridor ceiling framing and supply duct.',
    },
  ])
  const [exportOpen, setExportOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const addFiles = async (incoming: FileList | null) => {
    if (!incoming) return
    const selectedFiles = Array.from(incoming)
    const pendingFiles = selectedFiles.map((item) => {
      const kind = (item.type.startsWith('image/') ? 'image' : item.name.toLowerCase().endsWith('.pdf') ? 'pdf' : item.name.toLowerCase().endsWith('.eml') ? 'email' : 'other') as UploadedFile['kind']
      const size = item.size >= 1024 * 1024
        ? `${(item.size / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(item.size / 1024))} KB`

      return {
        source: item,
        entry: {
          id: crypto.randomUUID(),
          name: item.name,
          detail: `${kind === 'image' ? 'Photo' : kind === 'pdf' ? 'Document' : kind === 'email' ? 'Email' : 'File'} · ${size}`,
          kind,
          previewUrl: kind === 'image' ? URL.createObjectURL(item) : undefined,
          status: 'uploading' as const,
        },
      }
    })

    setFiles((current) => [...current, ...pendingFiles.map(({ entry }) => entry)])

    await Promise.all(pendingFiles.map(async ({ source, entry }) => {
      const formData = new FormData()
      formData.append('files', source)

      try {
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        })
        const result = await response.json() as UploadResponse

        if (!response.ok || !result.files[0]) {
          throw new Error(result.error || 'Upload failed')
        }

        setFiles((current) => current.map((file) => file.id === entry.id
          ? { ...file, serverUrl: result.files[0].url, status: 'uploaded' }
          : file))
      } catch {
        setFiles((current) => current.map((file) => file.id === entry.id
          ? { ...file, status: 'error' }
          : file))
      }
    }))
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    void addFiles(event.dataTransfer.files)
  }

  const removeFile = (id: string) => {
    setFiles((current) => {
      const removedFile = current.find((file) => file.id === id)
      if (removedFile?.previewUrl) URL.revokeObjectURL(removedFile.previewUrl)
      return current.filter((file) => file.id !== id)
    })
  }

  const handleGenerate = () => {
    setGenerating(true)
    setGenerated(false)
    window.setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
    }, 1400)
  }

  const sendMessage = (event: FormEvent) => {
    event.preventDefault()
    if (!chatInput.trim()) return
    const next = chatInput.trim()
    setChatMessages((messages) => [...messages, { role: 'user', text: next }])
    setChatInput('')
    window.setTimeout(() => {
      setChatMessages((messages) => [
        ...messages,
        {
          role: 'assistant',
          text: 'Done. I tightened the question, removed the implied assumption, and kept the drawing references intact.',
        },
      ])
    }, 500)
  }

  return (
    <div className={darkMode ? 'app dark' : 'app'}>
      <header className="topbar">
        <div className="brand">
          <button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">
            <Menu size={19} />
          </button>
          <div className="logo-mark"><FileText size={17} strokeWidth={2.4} /></div>
          <span className="brand-name">RFI Assistant</span>
          <span className="beta-pill">BETA</span>
        </div>
        <div className="project-switcher">
          <Building2 size={15} />
          <span>Mason Health Center</span>
          <ChevronDown size={14} />
        </div>
        <div className="topbar-actions">
          <button className="icon-button" onClick={() => setDarkMode(!darkMode)} aria-label="Toggle theme">
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-button" aria-label="Help"><CircleHelp size={18} /></button>
          <button className="avatar">OL</button>
        </div>
      </header>

      <div className="mobile-tabs">
        <button className={activeMobilePanel === 'workspace' ? 'active' : ''} onClick={() => setActiveMobilePanel('workspace')}>RFI draft</button>
        <button className={activeMobilePanel === 'chat' ? 'active' : ''} onClick={() => setActiveMobilePanel('chat')}>AI assistant</button>
      </div>

      <div className="app-shell">
        <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
          <div className="sidebar-top">
            <button className="new-rfi-button"><Plus size={17} /> New RFI <span className="shortcut">⌘ N</span></button>
            <nav className="main-nav">
              <button><LayoutDashboard size={17} /><span>Dashboard</span></button>
              <button className="active"><FolderOpen size={17} /><span>RFI workspace</span></button>
              <button><Archive size={17} /><span>All RFIs</span><span className="nav-count">128</span></button>
            </nav>
          </div>

          <div className="history-block">
            <div className="history-heading">
              <span>RECENT</span>
              <button aria-label="Search history"><Search size={14} /></button>
            </div>
            <div className="history-list">
              {recentRfis.map((rfi) => (
                <button className={`history-item ${rfi.active ? 'active' : ''}`} key={rfi.id}>
                  <span className="history-dot" />
                  <span className="history-copy">
                    <span className="history-title">{rfi.title}</span>
                    <span className="history-meta">{rfi.id} · {rfi.project}</span>
                  </span>
                  {rfi.active && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
            <button className="view-all"><History size={15} /> View all history</button>
          </div>

          <div className="sidebar-bottom">
            <div className="usage-card">
              <div className="usage-top"><span>Monthly usage</span><span>18 / 25</span></div>
              <div className="usage-bar"><span /></div>
              <button>Upgrade plan <ArrowRight size={13} /></button>
            </div>
            <button className="settings-link"><Settings size={17} /> Settings</button>
            <div className="user-row">
              <div className="avatar small">OL</div>
              <div><strong>Olivia Long</strong><span>Project Engineer</span></div>
              <MoreHorizontal size={17} />
            </div>
          </div>
        </aside>

        <main className={`workspace ${activeMobilePanel === 'chat' ? 'mobile-hidden' : ''}`}>
          <div className="workspace-header">
            <div>
              <div className="eyebrow">RFI-087 <span>•</span> DRAFT</div>
              <h1>Ceiling framing at Corridor 2</h1>
              <div className="save-state"><Check size={13} /> Saved just now</div>
            </div>
            <div className="workspace-actions">
              <button className="secondary-button"><MoreHorizontal size={17} /></button>
              <div className="export-wrap">
                <button className="secondary-button" onClick={() => setExportOpen(!exportOpen)}><Download size={16} /> Export <ChevronDown size={13} /></button>
                {exportOpen && (
                  <div className="export-menu">
                    {['PDF document', 'Word document', 'Email draft', 'Procore format'].map((item) => <button key={item}>{item}</button>)}
                  </div>
                )}
              </div>
              <button className="primary-button"><CheckCircle2 size={16} /> Finalize RFI</button>
            </div>
          </div>

          <div className="workspace-scroll">
            <section className="source-card">
              <div className="section-title-row">
                <div>
                  <div className="section-kicker"><Paperclip size={14} /> SOURCE MATERIAL</div>
                  <h2>Everything the AI should review</h2>
                </div>
                <span className="file-count">{files.length} files</span>
              </div>

              <div
                className={`dropzone ${isDragging ? 'dragging' : ''}`}
                onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInput.current?.click()}
              >
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  hidden
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    void addFiles(event.target.files)
                    event.target.value = ''
                  }}
                />
                <div className="upload-icon"><UploadCloud size={21} /></div>
                <div><strong>Drop files here or <span>browse</span></strong><small>Emails, drawings, photos, PDFs, audio, video, or documents</small></div>
                <button
                  className={`record-button ${recording ? 'recording' : ''}`}
                  onClick={(event) => { event.stopPropagation(); setRecording(!recording) }}
                >
                  <Mic size={15} /> {recording ? 'Recording…' : 'Record voice'}
                </button>
              </div>

              <div className="file-list">
                {files.map((item) => (
                  <div className="file-row" key={item.id}>
                    <div className={`file-type ${item.kind}`}>
                      {item.kind === 'image' && (item.previewUrl || item.serverUrl)
                        ? <img className="file-preview" src={item.previewUrl || item.serverUrl} alt={`Preview of ${item.name}`} />
                        : fileIcon(item.kind)}
                    </div>
                    <div className="file-copy"><strong>{item.name}</strong><span>{item.detail}</span></div>
                    <span className={`analysis-status ${item.status}`}>
                      {item.status === 'uploading' ? <span className="spinner" /> : item.status === 'error' ? <X size={14} /> : <CheckCircle2 size={14} />}
                      {item.status === 'uploading' ? 'Uploading…' : item.status === 'error' ? 'Upload failed' : item.status === 'uploaded' ? 'Uploaded' : 'Analyzed'}
                    </span>
                    <button className="remove-file" onClick={() => removeFile(item.id)}><X size={15} /></button>
                  </div>
                ))}
              </div>

              <div className="source-footer">
                <div className="analysis-summary">
                  <Sparkles size={15} />
                  <span><strong>AI found 3 key references</strong> across your source material</span>
                  <button>Review findings <ChevronRight size={13} /></button>
                </div>
                <button className="generate-button" onClick={handleGenerate} disabled={generating}>
                  {generating ? <span className="spinner" /> : <WandSparkles size={16} />}
                  {generating ? 'Analyzing package…' : 'Regenerate RFI'}
                </button>
              </div>
            </section>

            {generated ? (
              <section className="rfi-document">
                <div className="document-header">
                  <div>
                    <div className="section-kicker"><FileText size={14} /> GENERATED RFI</div>
                    <h2>Review and edit</h2>
                  </div>
                  <div className="confidence-badge"><span /> HIGH CONFIDENCE <CircleHelp size={14} /></div>
                </div>

                <div className="project-grid">
                  <label><span>PROJECT NAME</span><input defaultValue="Mason Health Center" /></label>
                  <label><span>GENERAL CONTRACTOR</span><input defaultValue="Redwood Construction Group" /></label>
                  <label><span>RFI NUMBER</span><input defaultValue="RFI-087" /></label>
                  <label><span>DATE</span><input defaultValue="July 20, 2026" /></label>
                </div>

                <div className="document-field subject-field">
                  <div className="field-heading"><label>SUBJECT</label><button><Pencil size={13} /> Edit</button></div>
                  <input defaultValue="Clarification of Ceiling Framing at Corridor 2" />
                </div>

                <div className="document-field">
                  <div className="field-heading"><label>DESCRIPTION OF ISSUE</label><button><Pencil size={13} /> Edit</button></div>
                  <textarea defaultValue="The reflected ceiling plan indicates a continuous gypsum board ceiling at the Level 2 east corridor. Based on field conditions, the ceiling framing shown conflicts with the main supply duct at Grid Line C between Rooms 218 and 220. The subcontractor is unable to maintain the specified ceiling elevation while providing the required clearance around the ductwork." />
                  <div className="reference-chips">
                    <span><FileText size={12} /> A401</span>
                    <span><Zap size={12} /> Grid Line C</span>
                    <span><Building2 size={12} /> Rooms 218–220</span>
                  </div>
                </div>

                <div className="document-field question-field">
                  <div className="field-heading"><label>QUESTION</label><button><Pencil size={13} /> Edit</button></div>
                  <div className="question-number">1</div>
                  <textarea defaultValue="Please clarify whether the ceiling elevation should be lowered in this area or provide a revised framing detail to accommodate the supply duct while maintaining the design intent." />
                  <button className="add-question"><Plus size={14} /> Add another question</button>
                </div>

                <div className="document-field resolution-field">
                  <div className="field-heading">
                    <label>SUGGESTED RESOLUTION <span>OPTIONAL</span></label>
                    <button><Pencil size={13} /> Edit</button>
                  </div>
                  <textarea defaultValue="Lower the corridor ceiling elevation locally by 2 inches and transition at the nearest control joint, subject to design team approval. This is provided for consideration only." />
                </div>

                <div className="attachments-section">
                  <label>ATTACHMENTS REFERENCED</label>
                  <div className="attachment-chips">
                    <span><FileImage size={14} /> Photo 1 – Corridor field condition <X size={12} /></span>
                    <span><FileText size={14} /> A401 – Level 2 RCP <X size={12} /></span>
                    <button><Plus size={13} /> Add reference</button>
                  </div>
                </div>

                <div className="quality-card">
                  <div className="score-ring"><strong>94</strong><span>/100</span></div>
                  <div className="quality-copy">
                    <div><strong>RFI quality check</strong><span>Ready for review</span></div>
                    <div className="quality-checks">
                      {['Clear & concise', 'Factual', 'No assumptions', 'References included'].map((item) => <span key={item}><Check size={12} /> {item}</span>)}
                    </div>
                  </div>
                  <button>View report <ChevronRight size={14} /></button>
                </div>
              </section>
            ) : (
              <div className="document-loading">
                <div className="loading-mark"><Sparkles size={25} /></div>
                <h2>Building your RFI</h2>
                <p>Cross-referencing drawings, email context, and field photos…</p>
                <div className="loading-line"><span /></div>
              </div>
            )}
          </div>
        </main>

        <aside className={`assistant-panel ${activeMobilePanel !== 'chat' ? 'mobile-hidden' : ''}`}>
          <div className="assistant-header">
            <div className="assistant-title"><div className="bot-icon"><Bot size={17} /></div><div><strong>AI Assistant</strong><span><i /> Ready to help</span></div></div>
            <button className="icon-button"><MoreHorizontal size={17} /></button>
          </div>

          <div className="assistant-context">
            <ShieldCheck size={15} />
            <span>Working with <strong>RFI-087</strong></span>
            <ChevronDown size={13} />
          </div>

          <div className="chat-scroll">
            <div className="chat-intro">
              <div className="sparkle-avatar"><Sparkles size={18} /></div>
              <h3>How can I help refine this RFI?</h3>
              <p>I can rewrite, verify references, find missing information, or adjust the tone.</p>
            </div>

            <div className="suggestions">
              {['Make it more concise', 'Remove assumptions', 'Check drawing references', 'Make the question stronger'].map((text) => (
                <button key={text} onClick={() => setChatInput(text)}><WandSparkles size={13} /> {text}</button>
              ))}
            </div>

            <div className="messages">
              {chatMessages.map((message, index) => (
                <div className={`message ${message.role}`} key={index}>
                  {message.role === 'assistant' && <div className="message-avatar"><Sparkles size={13} /></div>}
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <div className="insight-card">
              <div className="insight-heading"><Sparkles size={14} /><strong>AI insight</strong></div>
              <p>This condition may require coordination with the mechanical engineer before the architect responds.</p>
              <button>Add coordination note</button>
            </div>

            <div className="missing-card">
              <div className="missing-heading"><Clock3 size={14} /><strong>1 item to confirm</strong></div>
              <p>The field photo does not show a dimension from the bottom of duct to finished floor.</p>
              <button><Plus size={13} /> Add dimension</button>
            </div>
          </div>

          <form className="chat-composer" onSubmit={sendMessage}>
            <div className="composer-box">
              <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask AI to refine this RFI…" rows={2} />
              <div className="composer-actions">
                <button type="button" aria-label="Attach file"><Paperclip size={16} /></button>
                <span>⌘ ↵ to send</span>
                <button type="submit" className="send-button" aria-label="Send message"><Send size={15} /></button>
              </div>
            </div>
            <p>AI can make mistakes. Verify project details before submitting.</p>
          </form>
        </aside>
      </div>
    </div>
  )
}

export default App
