# n8n Outlook automation

The API still owns registration, OTP generation, booking, seats, QR tokens, and boarding codes. n8n only sends the emails.

```text
Student registers  →  API creates OTP  →  POST /webhook/galala-bus-otp      →  Outlook email
Student books trip →  API saves ticket →  POST /webhook/galala-bus-confirm  →  Outlook email
```

You do **not** replace Postgres, Redis, or the API with n8n. After `docker compose up`, open n8n, import these two workflows, connect Outlook once, and turn them **Active**.

## What to run

1. Start the stack (`postgres`, `redis`, `app`, `n8n`).
2. Open **http://localhost:5678** (this is the n8n editor from Docker, not a second local n8n unless you chose that).
3. Create the n8n owner login the first time (n8n's own login, not Microsoft yet).
4. Import:
   - `Galala Bus - Student OTP (Outlook).json`
   - `Galala Bus - Ticket Confirmation (Outlook).json`
5. Connect **Microsoft Outlook OAuth2** on both Outlook nodes (same credential).
6. Toggle each workflow **Active**.
7. Use the production webhook URLs (`/webhook/...`). Do not leave them in Test mode.

Docker already points the API at:

```text
http://n8n:5678/webhook/galala-bus-otp
http://n8n:5678/webhook/galala-bus-confirm
```

`n8n:5678` is the hostname inside Docker. Your browser still uses `localhost:5678`.

## Authentication you must set

| What | Why |
| :--- | :--- |
| n8n owner account | Protects the editor at port 5678 |
| Microsoft Outlook OAuth2 | Lets n8n send mail from **your** mailbox to the student's `@outlook.com` address |
| Optional `N8N_WEBHOOK_SECRET` | If set, the API sends header `x-n8n-secret`. Add Header Auth on the webhook nodes with the same value |

Outlook OAuth is the only extra auth for sending. Create it in n8n: **Credentials → Microsoft Outlook OAuth2 API**. Sign in with the mailbox that should appear as the sender (university or your test Outlook). Grant **Mail.Send**.

Microsoft may require an Azure app registration (redirect URL copied from n8n, permission `Mail.Send`, plus admin consent on work tenants). Personal `@outlook.com` senders usually work after the n8n OAuth popup.

Do **not** put Outlook passwords in git.

## How each workflow works

**OTP (3 nodes):** Webhook receives `{ fullName, email, academicId, otp }` → Code node builds HTML → Outlook sends it to that student email.

**Booking (3 nodes):** Webhook receives student details plus `legs[]` from the API. One-way = one QR and one manual code. Go + return = two of each. The QR image and `GU-XXXX` code are the ones already stored on the booking, so supervisors scan the same ticket as the app.

## If mail does not arrive

- Workflow must be **Active** (inactive webhooks return 404).
- Check **Executions** in n8n.
- API logs: `docker compose logs -f app n8n`
- If n8n is down, OTP still falls back to SMTP / console in the API.

Older Gmail/SMTP JSON files in this folder are optional. Use the Outlook files for this project.
