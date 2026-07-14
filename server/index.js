import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { randomUUID } from 'node:crypto'
import {
  addReaction,
  createConfession,
  listConfessions,
} from './confessionsRepository.js'

const app = express()
const port = Number(process.env.PORT || 4000)

const allowedReactionKeys = new Set([
  'like',
  'heart',
  'cry',
  'laugh',
  'dislike',
  'angry',
])

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/api/confessions', async (_request, response) => {
  try {
    const confessions = await listConfessions()
    response.json(confessions)
  } catch (error) {
    console.error('Failed to list confessions', error)
    response.status(500).json({ error: 'Failed to load confessions' })
  }
})

app.post('/api/confessions', async (request, response) => {
  const { title, content, penName } = request.body || {}

  if (!title?.trim() || !content?.trim()) {
    response.status(400).json({ error: 'Title and content are required' })
    return
  }

  try {
    const created = await createConfession({
      id: randomUUID(),
      title: title.trim(),
      content: content.trim(),
      penName: penName?.trim() || '',
    })

    response.status(201).json(created)
  } catch (error) {
    console.error('Failed to create confession', error)
    response.status(500).json({ error: 'Failed to create confession' })
  }
})

app.post('/api/confessions/:id/reactions', async (request, response) => {
  const { id } = request.params
  const { reactionKey, userId } = request.body || {}

  if (!allowedReactionKeys.has(reactionKey)) {
    response.status(400).json({ error: 'Invalid reaction key' })
    return
  }

  if (!userId?.trim()) {
    response.status(400).json({ error: 'Missing userId' })
    return
  }

  try {
    const updated = await addReaction(id, userId.trim(), reactionKey)
    response.json(updated)
  } catch (error) {
    console.error('Failed to react to confession', error)
    response.status(500).json({ error: 'Failed to update reaction' })
  }
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
