import { randomUUID } from 'node:crypto'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  defaultReactions,
  docClient,
  jsonResponse,
  parseBody,
  tableName,
} from './shared/db.js'

export const handler = async (event) => {
  if (!tableName) {
    return jsonResponse(500, { error: 'Missing CONFESSIONS_TABLE environment variable' })
  }

  const { title, content, penName } = parseBody(event)

  if (!title?.trim() || !content?.trim()) {
    return jsonResponse(400, { error: 'Title and content are required' })
  }

  const now = Date.now()
  const item = {
    id: randomUUID(),
    title: title.trim(),
    content: content.trim(),
    penName: penName?.trim() || '',
    createdAt: now,
    updatedAt: now,
    reactions: { ...defaultReactions },
    userReactions: {},
  }

  try {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    )

    return jsonResponse(201, item)
  } catch (error) {
    console.error('createConfession failed', error)
    return jsonResponse(500, { error: 'Failed to create confession' })
  }
}
