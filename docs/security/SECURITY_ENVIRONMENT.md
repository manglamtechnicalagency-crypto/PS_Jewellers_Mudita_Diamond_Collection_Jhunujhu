# Security Environment Configuration

| Variable | Required | Visibility | Purpose |
|---|---:|---|---|
| `R2_ACCOUNT_ID` | Yes | Server only | Cloudflare account used for the R2 endpoint. |
| `R2_ACCESS_KEY_ID` | Yes | Server only | R2 API credential. |
| `R2_SECRET_ACCESS_KEY` | Yes | Server only | R2 API credential. |
| `R2_BUCKET_NAME` | Yes | Server only | Public clean-media destination bucket. |
| `R2_QUARANTINE_BUCKET_NAME` | Yes | Server only | Private source-upload bucket. Never expose it through a public domain. |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Optional | Public | CDN/public read base URL. Set only when public object URLs are intentional. |
| `R2_UPLOAD_RATE_LIMIT_WINDOW_SECONDS` | Optional | Server only | Positive integer; defaults to 60. |
| `R2_UPLOAD_RATE_LIMIT_MAX_REQUESTS` | Optional | Server only | Positive integer; defaults to 30. |

Never use `NEXT_PUBLIC_` for credentials. Keep actual values only in the deployment secret manager or uncommitted `.env` files.
