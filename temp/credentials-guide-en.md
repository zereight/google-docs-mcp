# Google Docs MCP Authentication Setup Guide

1. Access Google Cloud Console: https://console.cloud.google.com/

2. Create a New Project
   - Click on the project selector in the top right corner → 'New Project'
   - Enter a project name (e.g., "Google Docs MCP")
   - Click 'Create'

3. Enable API Libraries
   - In the left sidebar, select 'APIs & Services' → 'Library'
   - Search for and enable both "Google Docs API" and "Google Drive API"
   ![Google Cloud Console Screenshot](1.png)

4. Set Up OAuth Consent Screen
   - In the left sidebar, select 'APIs & Services' → 'OAuth consent screen'
   - Select user type (typically 'External') and click 'Create'
   - Enter required information (app name, user support email, etc.)
   - Add scopes: 
     * https://www.googleapis.com/auth/documents
     * https://www.googleapis.com/auth/drive
   - Click 'Save and Continue' to complete the remaining steps

5. Generate Authentication Credentials
   - In the left sidebar, select 'APIs & Services' → 'Credentials'
   - Click '+ Create Credentials' → 'OAuth client ID'
   - Application type: Select 'Desktop app'
   - Enter a name (e.g., "Google Docs MCP Desktop")
   - Click 'Create'
   - Click the Download JSON button
   ![Google Cloud Console Screenshot](2.png)

6. Apply Authentication File
   - Rename the downloaded JSON file to 'credentials.json'
   - Copy this file to the project root directory
   - Important: The file must be named 'credentials.json' and placed directly in the project root directory

7. Run Authentication
   - Run `npm run build` to build the code
   - Run `npm run auth` to start the authentication process
   - A browser will automatically open and navigate to the authentication URL
   - Log in with your Google account and grant the requested permissions
   - Upon completion, you'll be automatically redirected to localhost and the token will be saved
   - A success page will be displayed in the browser and the script will automatically terminate
   - The token is saved in the `token.json` file in your project directory

8. Service Registration
   - Register the service in the MCP server configuration file (typically ~/.cursor/mcp.json):
   ```json
   "google-docs": {
      "command": "node",
      "args": ["/path/to/google-docs-mcp/build/index.js"],
      "env": {
        "GOOGLE_DOCS_CREDENTIALS_PATH": "/path/to/google-docs-mcp/credentials.json",
        "GOOGLE_DOCS_TOKEN_PATH": "/path/to/google-docs-mcp/token.json"
      }
   }
   ```
   - Replace the paths with the actual location of your project
   - After registration, the MCP server will automatically recognize and use the service