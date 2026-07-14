import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'

const region = process.env.AWS_REGION || 'us-east-1'

const clientConfig = { region }

if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT
}

const dynamoClient = new DynamoDBClient(clientConfig)

export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export const confessionsTableName =
  process.env.CONFESSIONS_TABLE || 'NobiTalksConfessions'
