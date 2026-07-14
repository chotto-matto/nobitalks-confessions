import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { docClient, jsonResponse, tableName } from './shared/db.js'

export const handler = async () => {
  if (!tableName) {
    return jsonResponse(500, { error: 'Missing CONFESSIONS_TABLE environment variable' })
  }

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
      }),
    )

    const items = result.Items || []
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    return jsonResponse(200, items)
  } catch (error) {
    console.error('listConfessions failed', error)
    return jsonResponse(500, { error: 'Failed to load confessions' })
  }
}
