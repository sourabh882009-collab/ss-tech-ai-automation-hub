# SS TECH AI Automation Hub V1

Static demo. Serve dist/ over HTTP. The dashboard is at / and the intake UI at /?view=submit. Both are available to the owner in the private ChatGPT Sites deployment. Users should enter fictional information. Browser storage is shared between these views on the same origin and browser profile. If storage is blocked, demo data lasts only for the current page session.

## Production migration

Deploy dist/ as Cloudflare static assets and move record operations from app.js/model.js to Worker endpoints backed by D1. Use separate storage for this app. Enforce workspace membership and admin role server-side for all management endpoints. Put intake behind a write-only endpoint with server validation, abuse controls and explicit consent before accepting real contact information. Use a server transaction for workflow and activity writes. Configure retention before accepting real records.

Workflow trigger and action definitions live in model.js. Future Instagram AutoDM and WhatsApp connectors should consume server-side events, store credentials in server secrets, and validate webhook signatures. Add deduplication and delivery state before enabling external sends. No integrations, paid APIs, or Shreevika data connections are configured.
