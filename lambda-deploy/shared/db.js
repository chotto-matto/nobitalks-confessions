import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'

export const tableName = process.env.CONFESSIONS_TABLE

const client = new DynamoDBClient({ region })
export const docClient = DynamoDBDocumentClient.from(client)

export const reactionKeys = new Set([
  'like',
  'heart',
  'cry',
  'laugh',
  'dislike',
  'angry',
])

export const defaultReactions = {
  like: 0,
  heart: 0,
  cry: 0,
  laugh: 0,
  dislike: 0,
  angry: 0,
}

export function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  }
}

export function parseBody(event) {
  if (!event?.body) {
    return {}
  }

  try {
    return JSON.parse(event.body)
  } catch {
    return {}
  }
}
