const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function parseResponse(response) {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const message = payload.error || `Request failed: ${response.status}`
    throw new Error(message)
  }

  return response.json()
}

export async function fetchConfessions() {
  const response = await fetch(`${API_BASE}/confessions`)
  return parseResponse(response)
}

export async function createConfession(payload) {
  const response = await fetch(`${API_BASE}/confessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseResponse(response)
}

export async function addConfessionReaction(id, reactionKey, userId) {
  const response = await fetch(`${API_BASE}/confessions/${id}/reactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reactionKey, userId }),
  })

  return parseResponse(response)
}
