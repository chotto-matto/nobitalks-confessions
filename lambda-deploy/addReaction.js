import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import {
  defaultReactions,
  docClient,
  jsonResponse,
  parseBody,
  reactionKeys,
  tableName,
} from './shared/db.js'

export const handler = async (event) => {
  if (!tableName) {
    return jsonResponse(500, { error: 'Missing CONFESSIONS_TABLE environment variable' })
  }

  const id = event?.pathParameters?.id
  const { reactionKey, userId } = parseBody(event)

  if (!id) {
    return jsonResponse(400, { error: 'Missing confession id' })
  }

  if (!reactionKeys.has(reactionKey)) {
    return jsonResponse(400, { error: 'Invalid reaction key' })
  }

  if (!userId?.trim()) {
    return jsonResponse(400, { error: 'Missing userId' })
  }

  try {
    const existing = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id },
      }),
    )

    if (!existing.Item) {
      return jsonResponse(404, { error: 'Confession not found' })
    }

    const reactions = {
      ...defaultReactions,
      ...(existing.Item.reactions || {}),
    }
    const userReactions = { ...(existing.Item.userReactions || {}) }
    const previousReaction = userReactions[userId]

    if (previousReaction === reactionKey) {
      reactions[reactionKey] = Math.max(0, (reactions[reactionKey] || 0) - 1)
      delete userReactions[userId]
    } else {
      if (reactionKeys.has(previousReaction)) {
        reactions[previousReaction] = Math.max(0, (reactions[previousReaction] || 0) - 1)
      }

      reactions[reactionKey] = (reactions[reactionKey] || 0) + 1
      userReactions[userId] = reactionKey
    }

    const updated = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id },
        UpdateExpression: 'SET reactions = :reactions, userReactions = :userReactions, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':reactions': reactions,
          ':userReactions': userReactions,
          ':updatedAt': Date.now(),
        },
        ConditionExpression: 'attribute_exists(id)',
        ReturnValues: 'ALL_NEW',
      }),
    )

    return jsonResponse(200, updated.Attributes)
  } catch (error) {
    if (error?.name === 'ConditionalCheckFailedException') {
      return jsonResponse(404, { error: 'Confession not found' })
    }

    console.error('addReaction failed', error)
    return jsonResponse(500, { error: 'Failed to add reaction' })
  }
}
