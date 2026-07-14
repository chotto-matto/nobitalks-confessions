import {
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { docClient, confessionsTableName } from './dynamoClient.js'

const defaultReactions = {
  like: 0,
  heart: 0,
  cry: 0,
  laugh: 0,
  dislike: 0,
  angry: 0,
}

const validReactionKeys = new Set(Object.keys(defaultReactions))

export async function listConfessions() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: confessionsTableName,
    }),
  )

  const items = result.Items || []
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export async function createConfession(confession) {
  const now = Date.now()
  const item = {
    ...confession,
    createdAt: now,
    updatedAt: now,
    reactions: { ...defaultReactions },
    userReactions: {},
  }

  await docClient.send(
    new PutCommand({
      TableName: confessionsTableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id)',
    }),
  )

  return item
}

export async function addReaction(id, userId, reactionKey) {
  const existing = await docClient.send(
    new GetCommand({
      TableName: confessionsTableName,
      Key: { id },
    }),
  )

  if (!existing.Item) {
    throw new Error('Confession not found')
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
    if (validReactionKeys.has(previousReaction)) {
      reactions[previousReaction] = Math.max(0, (reactions[previousReaction] || 0) - 1)
    }

    reactions[reactionKey] = (reactions[reactionKey] || 0) + 1
    userReactions[userId] = reactionKey
  }

  const updated = await docClient.send(
    new UpdateCommand({
      TableName: confessionsTableName,
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

  return updated.Attributes
}
