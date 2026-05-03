# ReqFlow Deployment

ReqFlow can run as a single production service: Express serves the API and, when `CLIENT_DIST_DIR` is set, serves the built React app from the same port.

## Required Environment

```bash
OPENAI_API_KEY=your-provider-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o
REQFLOW_DATA_DIR=/data
REQFLOW_REQUEST_LOGS=1
REQFLOW_AUTH_MODE=local
```

For DeepSeek:

```bash
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-v4-flash
```

Do not commit real API keys. Use shell environment variables, secret managers, or deployment platform secrets.

## Docker Compose

```bash
OPENAI_API_KEY=your-key \
OPENAI_BASE_URL=https://api.deepseek.com \
OPENAI_MODEL=deepseek-v4-flash \
docker compose up --build
```

Then open:

```text
http://localhost:3002
```

Health check:

```bash
curl http://localhost:3002/api/health
curl http://localhost:3002/api/ready
```

The SQLite data store is persisted in the `reqflow-data` Docker volume mounted at `/data`.

## Production Build Without Docker

```bash
(cd client && npm ci && npm run build)
(cd server && npm ci && npm run build)

CLIENT_DIST_DIR="$(pwd)/client/dist" \
REQFLOW_DATA_DIR="$(pwd)/data" \
OPENAI_API_KEY=your-key \
OPENAI_BASE_URL=https://api.deepseek.com \
OPENAI_MODEL=deepseek-v4-flash \
node server/dist/index.js
```

## Operational Notes

- `x-request-id` is returned on errors and can be supplied by upstream gateways.
- `/api/health` reports that the process is alive. `/api/ready` verifies storage access and LLM configuration, and is used by the Docker healthcheck.
- `x-reqflow-workspace` enforces lightweight workspace isolation.
- `x-reqflow-role` enforces lightweight role boundaries: `viewer`, `reviewer`, `editor`, `admin`.
- `x-reqflow-actor` records the operator in audit logs.
- For enterprise identity, inject these headers from a trusted gateway or SSO middleware rather than accepting user-controlled browser values directly.
- Set `REQFLOW_AUTH_MODE=trusted-header` in production behind such a gateway. In this mode every API except `/api/health` and `/api/ready` must include `x-reqflow-actor`, `x-reqflow-workspace`, and a valid `x-reqflow-role`.
