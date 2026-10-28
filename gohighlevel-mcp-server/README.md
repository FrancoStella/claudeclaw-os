# GoHighLevel MCP Server

MCP server for GoHighLevel API integration. Send SMS/email, manage contacts, and track webinar statistics through Claude Desktop, Claude Code, or any MCP-compatible client.

## Features

### 🔍 Contact Management
- **`ghl_search_contacts`** - Search contacts by name, email, phone, or tags
- **`ghl_get_contact`** - Get detailed contact information by ID

### 💬 Messaging
- **`ghl_send_sms`** - Send SMS messages to contacts
- **`ghl_send_email`** - Send email messages to contacts (HTML supported)

### 📊 Webinar Analytics
- **`ghl_get_webinar_stats`** - Get webinar attendance and completion statistics
  - Track registrations, attendance, and completion rates
  - Filter by date or webinar name
  - Works with WebinarKit + GHL automation tags

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Credentials

Add your GoHighLevel API credentials to `~/.config/claudeclaw/.env`:

```bash
GHL_API_KEY=your_api_key_here
GHL_LOCATION_ID=your_location_id_here
```

**How to get your credentials:**
1. Log into GoHighLevel web dashboard
2. Go to Settings → Integrations → API Keys
3. Copy your API key
4. Copy your Location ID (found in settings or URL)

### 3. Build the Server

```bash
npm run build
```

### 4. Test the Server

```bash
# Test that it starts
node dist/index.js

# Or use MCP Inspector for interactive testing
npx @modelcontextprotocol/inspector node dist/index.js
```

## Usage with Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gohighlevel": {
      "command": "node",
      "args": ["/Users/francostella/claudeclaw-os/gohighlevel-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

Restart Claude Desktop and the tools will be available.

## Usage with ClaudeClaw (Telegram Bot)

The server automatically works with claudeclaw since credentials are in `~/.config/claudeclaw/.env`. Just add the server to your MCP config and restart the bot.

## Tool Examples

### Search Contacts
```
Use ghl_search_contacts to find all contacts who attended webinars
Params: { tags: ["Webinar - Attended"] }
```

### Send SMS
```
Use ghl_send_sms to send a follow-up message
Params: { contact_id: "abc123", message: "Thanks for attending our webinar!" }
```

### Get Webinar Stats
```
Use ghl_get_webinar_stats to see today's webinar performance
Params: { date: "2026-05-13" }
```

## Webinar Tags

For webinar stats to work, your GHL automations must tag contacts with:
- `Webinar - Registered` (or `Webinar - {name} - Registered`)
- `Webinar - Attended` (or `Webinar - {name} - Attended`)
- `Webinar - Completed` (or `Webinar - {name} - Completed`)

Adjust tag names in `src/tools/webinars.ts` if your tags differ.

## Development

```bash
# Watch mode with auto-reload
npm run dev

# Build
npm run build

# Clean build artifacts
npm run clean
```

## API Reference

### Authentication
- Uses Bearer token authentication
- Base URL: `https://services.leadconnectorhq.com`
- API Version: `2021-07-28`

### Endpoints Used
- `POST /contacts/search` - Search contacts
- `GET /contacts/{contactId}` - Get contact
- `POST /conversations/messages` - Send SMS/Email

## Troubleshooting

**Error: GHL_API_KEY is required**
- Add your API key to `~/.config/claudeclaw/.env`

**Error: Authentication Failed**
- Check that your API key is valid
- Verify the key has correct permissions in GHL

**Error: Permission Denied**
- Your API key may not have access to certain features (SMS, email)
- Check GHL settings and API key permissions

**No webinar data found**
- Verify your GHL automations are tagging contacts correctly
- Check tag names match what's configured in the tool

## Links

- [GoHighLevel API Documentation](https://marketplace.gohighlevel.com/docs/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
