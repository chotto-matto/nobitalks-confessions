import { useEffect, useState } from 'react'
import './App.css'
import { addConfessionReaction, createConfession, fetchConfessions } from './api'

const reactionOptions = [
  { key: 'like', label: 'Like', emoji: '👍' },
  { key: 'heart', label: 'Heart', emoji: '❤️' },
  { key: 'cry', label: 'Cry', emoji: '😢' },
  { key: 'laugh', label: 'Laugh', emoji: '😂' },
  { key: 'dislike', label: 'Dislike', emoji: '👎' },
  { key: 'angry', label: 'Angry', emoji: '😠' },
]

const blankForm = {
  title: '',
  penName: '',
  content: '',
}

function totalReactions(reactions) {
  return Object.values(reactions).reduce((sum, count) => sum + count, 0)
}

function formatSubmittedDate(timestamp) {
  if (!timestamp) {
    return 'Unknown date'
  }

  const asDate = new Date(timestamp)

  if (Number.isNaN(asDate.getTime())) {
    return 'Unknown date'
  }

  return asDate.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatShortId(id) {
  const asText = String(id ?? '')
  return asText.split('-')[0] || asText
}

function matchesConfessionSearch(confession, query) {
  if (!query) {
    return true
  }

  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  const title = String(confession.title || '').toLowerCase()
  const penName = String(confession.penName || '').toLowerCase()
  const fullId = String(confession.id ?? '').toLowerCase()
  const shortId = formatShortId(confession.id).toLowerCase()

  return (
    title.includes(normalizedQuery) ||
    penName.includes(normalizedQuery) ||
    fullId.includes(normalizedQuery) ||
    shortId.includes(normalizedQuery)
  )
}

function getOrCreateViewerId() {
  const storageKey = 'nobitalks_viewer_id'
  const existing = window.localStorage.getItem(storageKey)

  if (existing) {
    return existing
  }

  const created =
    window.crypto?.randomUUID?.() || `viewer-${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(storageKey, created)
  return created
}

function applyLocalReactionToggle(confession, userId, reactionKey) {
  const currentUserReactions = { ...(confession.userReactions || {}) }
  const previousReaction = currentUserReactions[userId]
  const nextReactions = { ...confession.reactions }

  if (previousReaction === reactionKey) {
    nextReactions[reactionKey] = Math.max(0, (nextReactions[reactionKey] || 0) - 1)
    delete currentUserReactions[userId]
  } else {
    if (previousReaction) {
      nextReactions[previousReaction] = Math.max(
        0,
        (nextReactions[previousReaction] || 0) - 1,
      )
    }

    nextReactions[reactionKey] = (nextReactions[reactionKey] || 0) + 1
    currentUserReactions[userId] = reactionKey
  }

  return {
    ...confession,
    reactions: nextReactions,
    userReactions: currentUserReactions,
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [confessions, setConfessions] = useState([])
  const [selectedConfession, setSelectedConfession] = useState(null)
  const [showSentModal, setShowSentModal] = useState(false)
  const [formData, setFormData] = useState(blankForm)
  const [searchInput, setSearchInput] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(50)
  const [apiNotice, setApiNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewerId] = useState(() => getOrCreateViewerId())

  const filteredConfessions = confessions.filter((confession) =>
    matchesConfessionSearch(confession, activeSearchQuery),
  )
  const visibleConfessions = filteredConfessions.slice(0, visibleCount)
  const hasMoreConfessions = visibleCount < filteredConfessions.length

  useEffect(() => {
    let isMounted = true

    const loadConfessions = async () => {
      try {
        const remoteConfessions = await fetchConfessions()

        if (!isMounted) {
          return
        }

        if (Array.isArray(remoteConfessions) && remoteConfessions.length > 0) {
          setConfessions(remoteConfessions)
          setApiNotice('')
          return
        }

        if (Array.isArray(remoteConfessions)) {
          setConfessions(remoteConfessions)
          setApiNotice('No confessions yet. Be the first to post.')
          return
        }

        setApiNotice('Unexpected API response format.')
      } catch {
        if (!isMounted) {
          return
        }

        setConfessions([])
        setApiNotice('AWS backend not reachable yet.')
      }
    }

    loadConfessions()

    return () => {
      isMounted = false
    }
  }, [])

  const openConfession = (confession) => {
    setSelectedConfession(confession)
  }

  const closeConfession = () => {
    setSelectedConfession(null)
  }

  const closeSentModal = () => {
    setShowSentModal(false)
    setCurrentPage('confessions')
  }

  const handleReaction = async (confessionId, reactionKey) => {
    try {
      const updatedFromApi = await addConfessionReaction(confessionId, reactionKey, viewerId)

      setConfessions((currentConfessions) =>
        currentConfessions.map((confession) =>
          confession.id === confessionId ? updatedFromApi : confession,
        ),
      )

      if (selectedConfession?.id === confessionId) {
        setSelectedConfession(updatedFromApi)
      }

      return
    } catch {
      setApiNotice('Could not reach backend for reactions. Updated locally for now.')
    }

    setConfessions((currentConfessions) =>
      currentConfessions.map((confession) => {
        if (confession.id !== confessionId) {
          return confession
        }

        const updatedConfession = applyLocalReactionToggle(confession, viewerId, reactionKey)

        if (selectedConfession?.id === confessionId) {
          setSelectedConfession(updatedConfession)
        }

        return updatedConfession
      }),
    )
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const title = formData.title.trim()
    const content = formData.content.trim()
    const penName = formData.penName.trim()

    if (!title || !content) {
      return
    }

    setIsSubmitting(true)

    try {
      const created = await createConfession({ title, content, penName })
      setConfessions((currentConfessions) => [created, ...currentConfessions])
      setApiNotice('')
    } catch {
      const newConfession = {
        id: Date.now(),
        title,
        penName,
        content,
        createdAt: Date.now(),
        reactions: {
          like: 0,
          heart: 0,
          cry: 0,
          laugh: 0,
          dislike: 0,
          angry: 0,
        },
        userReactions: {},
      }

      setConfessions((currentConfessions) => [newConfession, ...currentConfessions])
      setApiNotice('Backend create failed. Saved locally for now.')
    } finally {
      setIsSubmitting(false)
    }

    setFormData(blankForm)
    setShowSentModal(true)
  }

  const handleCardKeyDown = (event, confession) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openConfession(confession)
    }
  }

  const handleSearchInputChange = (event) => {
    setSearchInput(event.target.value)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setActiveSearchQuery(searchInput)
    setVisibleCount(50)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setActiveSearchQuery('')
    setVisibleCount(50)
  }

  const handleShowMore = () => {
    setVisibleCount((currentCount) => currentCount + 50)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="brand-kicker">Safe space for unfiltered thoughts</p>
          <h1>NobiTalks: Annonymous Confessions</h1>
        </div>

        <nav className="nav-links" aria-label="Main navigation">
          <button
            type="button"
            className={currentPage === 'home' ? 'nav-link active' : 'nav-link'}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={currentPage === 'write' ? 'nav-link active' : 'nav-link'}
            onClick={() => setCurrentPage('write')}
          >
            Write
          </button>
          <button
            type="button"
            className={currentPage === 'confessions' ? 'nav-link active' : 'nav-link'}
            onClick={() => setCurrentPage('confessions')}
          >
            Confessions
          </button>
        </nav>
      </header>

      <main className="page-shell">
        {apiNotice && <p className="api-notice">{apiNotice}</p>}

        {currentPage === 'home' && (
          <section className="hero-panel">
            <div className="hero-stack">
              <div className="hero-copy">
                <h2>A quiet place to let it out.</h2>
                <p>
                  Hi! I&apos;m Edward, a person who loves listening to rants and whatever&apos;s in
                  people&apos;s minds. I created this site to give people a place where they can just
                  say whatever they want. Everything here remains anonymous, should you ever
                  feel like you want to be known, feel free to do so.
                </p>
                <p className="signature">
                  Follow me on TikTok, where I share and react to the confessions on live: <a
                    href="https://tiktok.com/@edwardsz.m"
                    target="_blank"
                    rel="noreferrer"
                  >
                    tiktok.com/@edwardsz.m
                  </a>
                </p>
              </div>

              <div className="hero-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setCurrentPage('write')}
                >
                  Write
                </button>
              </div>
            </div>
          </section>
        )}

        {currentPage === 'write' && (
          <section className="panel write-panel">
            <div className="section-heading">
              <span className="section-tag">Write</span>
              <h2>Send something honest.</h2>
              <p>Share a rant, a confession, a passing thought, or anything else on your mind.</p>
            </div>

            <form className="confession-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>Title</span>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Give your confession a title"
                    required
                  />
                </label>

                <label className="field">
                  <span>Pen name (optional)</span>
                  <input
                    type="text"
                    name="penName"
                    value={formData.penName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="Stay anonymous or add a pen name"
                  />
                </label>
              </div>

              <label className="field field-large">
                <span>Your message</span>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="Write whatever you want to say here..."
                  required
                />
              </label>

              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send anonymous message'}
                </button>
              </div>
            </form>
          </section>
        )}

        {currentPage === 'confessions' && (
          <section className="panel confessions-panel">
            <div className="section-heading confessions-heading">
              <div>
                <span className="section-tag">Confessions</span>
                <h2>What people have shared</h2>
              </div>
              <p>{confessions.length} messages posted</p>
            </div>

            <form className="confession-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchInputChange}
                placeholder="Search by title, ID, or pen name"
                aria-label="Search confessions"
              />
              <div className="search-actions">
                <button type="submit" className="primary-button">
                  Search
                </button>
                <button type="button" className="primary-button" onClick={handleClearSearch}>
                  Clear
                </button>
              </div>
            </form>

            {activeSearchQuery.trim() && (
              <p className="search-results-note">
                {filteredConfessions.length} result(s) for &quot;{activeSearchQuery.trim()}&quot;
              </p>
            )}

            <div className="confession-grid">
              {visibleConfessions.map((confession) => (
                <article
                  key={confession.id}
                  className="confession-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open confession: ${confession.title}`}
                  onClick={() => openConfession(confession)}
                  onKeyDown={(event) => handleCardKeyDown(event, confession)}
                >
                  <div className="card-header">
                    <h3>{confession.title}</h3>
                    <p>Submitted by: {confession.penName || 'Anonymous'}</p>
                    <p className="card-meta">ID: {formatShortId(confession.id)}</p>
                    <p className="card-meta">Submitted: {formatSubmittedDate(confession.createdAt)}</p>
                  </div>

                  <p className="content-preview">{confession.content}</p>

                  <div className="card-footer">
                    <span>{totalReactions(confession.reactions)} reactions</span>
                  </div>

                  <div className="reaction-bar" aria-label={`Reactions for ${confession.title}`}>
                    {reactionOptions.map((reaction) => (
                      <button
                        key={reaction.key}
                        type="button"
                        className={
                          confession.userReactions?.[viewerId] === reaction.key
                            ? 'reaction-chip active'
                            : 'reaction-chip'
                        }
                        aria-pressed={confession.userReactions?.[viewerId] === reaction.key}
                        onClick={(event) => {
                          event.stopPropagation()
                          handleReaction(confession.id, reaction.key)
                        }}
                      >
                        <span aria-hidden="true">{reaction.emoji}</span>
                        <span>{confession.reactions[reaction.key]}</span>
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {visibleConfessions.length === 0 && (
              <p className="search-results-note">No confessions matched your search.</p>
            )}

            {hasMoreConfessions && (
              <div className="show-more-wrap">
                <button type="button" className="primary-button" onClick={handleShowMore}>
                  Show more
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {selectedConfession && (
        <div className="modal-backdrop" role="presentation" onClick={closeConfession}>
          <section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-author">
                  Submitted by: {selectedConfession.penName || 'Anonymous'}
                </p>
                <h2 id="modal-title">{selectedConfession.title}</h2>
                <p className="modal-meta">ID: {formatShortId(selectedConfession.id)}</p>
                <p className="modal-meta">
                  Submitted: {formatSubmittedDate(selectedConfession.createdAt)}
                </p>
              </div>
              <button type="button" className="close-button" onClick={closeConfession}>
                Close
              </button>
            </div>

            <p className="modal-content">{selectedConfession.content}</p>

            <div className="modal-reactions">
              <p>Total reactions: {totalReactions(selectedConfession.reactions)}</p>
              <div className="modal-reaction-grid">
                {reactionOptions.map((reaction) => (
                  <button
                    key={reaction.key}
                    type="button"
                    className={
                      selectedConfession.userReactions?.[viewerId] === reaction.key
                        ? 'modal-reaction-item active'
                        : 'modal-reaction-item'
                    }
                    aria-pressed={selectedConfession.userReactions?.[viewerId] === reaction.key}
                    onClick={() => handleReaction(selectedConfession.id, reaction.key)}
                  >
                    <span>
                      {reaction.emoji} {reaction.label}
                    </span>
                    <strong>{selectedConfession.reactions[reaction.key]}</strong>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {showSentModal && (
        <div className="modal-backdrop" role="presentation" onClick={closeSentModal}>
          <section
            className="modal-card success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sent-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="success-modal-body">
              <h2 id="sent-modal-title">Message sent!</h2>
              <p>Your confession has been posted anonymously.</p>
              <button type="button" className="primary-button" onClick={closeSentModal}>
                Go to Confessions
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
