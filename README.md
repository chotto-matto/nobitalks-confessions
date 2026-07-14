# NobiTalks: AWS Backend Integration Guide

This project frontend is now AWS-ready.

The app expects these API routes:
- `GET /api/confessions`
- `POST /api/confessions`
- `POST /api/confessions/{id}/reactions`

Set your deployed API Gateway base URL in `.env`:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
VITE_API_BASE_URL=https://your-api-id.execute-api.your-region.amazonaws.com/prod/api
```

## 1. AWS Services to Use

- API Gateway (HTTP API)
- Lambda (Node.js 20+)
- DynamoDB (single table)
- IAM roles/policies
- CloudWatch Logs

## 2. Create DynamoDB Table

Table name suggestion: `NobiTalksConfessions`

- Partition key: `id` (String)
- Billing mode: On-demand

Recommended item shape:

```json
{
	"id": "uuid",
	"title": "string",
	"content": "string",
	"penName": "string",
	"createdAt": 1720000000000,
	"updatedAt": 1720000000000,
	"reactions": {
		"like": 0,
		"heart": 0,
		"cry": 0,
		"laugh": 0,
		"dislike": 0,
		"angry": 0
	}
}
```

## 3. Create Lambda Functions

Create 3 Lambda functions (Node.js):

1. `listConfessions`
2. `createConfession`
3. `addReaction`

Each Lambda should:
- Use `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`
- Read table name from env var: `CONFESSIONS_TABLE`
- Return JSON with CORS headers

### `listConfessions` logic

- `Scan` table
- Sort by `createdAt` descending
- Return array

### `createConfession` logic

- Validate `title` and `content`
- Generate UUID for `id`
- Add default reactions object
- `Put` item
- Return created item

### `addReaction` logic

- Validate `reactionKey` in: `like, heart, cry, laugh, dislike, angry`
- `Update` reaction counter atomically
- Return updated item

## 4. IAM Permissions

Lambda execution role needs DynamoDB permissions on your table:

- `dynamodb:Scan`
- `dynamodb:PutItem`
- `dynamodb:GetItem`
- `dynamodb:UpdateItem`

## 5. API Gateway Setup (HTTP API)

Create routes and integrate each with Lambda:

- `GET /api/confessions` -> `listConfessions`
- `POST /api/confessions` -> `createConfession`
- `POST /api/confessions/{id}/reactions` -> `addReaction`

Enable CORS:
- Allowed origin: your frontend domain(s) and `http://localhost:5173`
- Allowed methods: `GET, POST, OPTIONS`
- Allowed headers: `Content-Type`

Deploy to stage `prod`.

## 6. Connect Frontend

1. Copy API Gateway invoke URL into `.env` as `VITE_API_BASE_URL`.
2. Restart Vite dev server.

Run:

```bash
npm install
npm run dev
```

## 7. Verify End-to-End

1. Open app and go to Confessions: existing rows should load from DynamoDB.
2. Submit on Write page: new item should appear and persist after refresh.
3. React on a card: counter should increment and persist.

## 8. Production Notes

- Add AWS WAF/rate limiting on API Gateway.
- Consider CloudFront in front of frontend hosting.
- Add validation and content moderation as needed.
- Add auth later if you need admin-only moderation endpoints.

## 9. Deploy Frontend to GitHub Pages

This repo includes a workflow at `.github/workflows/deploy-pages.yml`.

1. Push to `main`.
2. In GitHub, open Settings -> Pages and set Source to `GitHub Actions`.
3. In GitHub, open Settings -> Secrets and variables -> Actions -> Variables.
4. Add repository variable `VITE_API_BASE_URL` with your deployed API Gateway base URL.

Example:

```env
VITE_API_BASE_URL=https://your-api-id.execute-api.ap-southeast-1.amazonaws.com/prod/api
```

The workflow automatically sets `VITE_BASE_PATH` to your repository name, so assets load correctly on GitHub Pages project URLs.
