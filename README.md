# Google Docs MCP Server

A Google Docs MCP (Model Context Protocol) Server. This package provides functionalities to access, read, and edit Google Docs documents.

## How to Install

Clone the repository and set up for local use:

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/google-docs-mcp.git
   cd google-docs-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Google Cloud authentication by following our [detailed guide](temp/credentials-guide-en.md).

## Usage

### Using with Claude App, Cline, Roo Code, Cursor

When using with the Claude App, you need to set up your configuration directly:

```json
{
  "mcpServers": {
    "Google Docs communication server": {
      "command": "node",
      "args": ["/absolute/path/to/google-docs-mcp/build/index.js"],
      "env": {
        "GOOGLE_DOCS_CREDENTIALS_PATH": "/path/to/credentials.json",
        "GOOGLE_DOCS_TOKEN_PATH": "/path/to/token.json"
      }
    }
  }
}
```

### Environment Variables

- `GOOGLE_DOCS_CREDENTIALS_PATH`: Path to Google API credentials file (default: `credentials.json` in the project root directory)
- `GOOGLE_DOCS_TOKEN_PATH`: Path to authentication token file (default: `token.json` in the project root directory)

## Authentication Setup 🔑

Follow the [detailed guide](temp/credentials-guide-en.md) mentioned in the installation section to set up Google Cloud authentication.

## Tools 🛠️

1. `google_docs_hello`

   - Basic greeting functionality 👋
   - Inputs:
     - `name` (string): Name of the person to greet
   - Returns: Greeting message

2. `google_docs_read_document`

   - Read a Google Docs document 📄
   - Inputs:
     - `documentId` (string): ID of the document to read
   - Returns: Document content and metadata

## License

MIT License 