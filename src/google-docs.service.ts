import path from 'path';
import os from 'os';
import fs from 'fs';
import { google, docs_v1, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { authenticate } from '@google-cloud/local-auth';

// Define the scopes needed for Docs and Drive APIs
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive', // Needed for sharing, comments, etc.
];

// Define paths for credentials and token storage
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json'); // Assumes credentials.json is in the project root
const TOKEN_PATH = path.join(os.homedir(), '.google_docs_mcp_token.json'); // Store token in user's home directory

export class GoogleDocsService {
  private oauth2Client: OAuth2Client | null = null;
  private docs: docs_v1.Docs | null = null;
  private drive: drive_v3.Drive | null = null;

  constructor() {
    // Initialization logic will go here, likely called asynchronously
  }

  /**
   * Authenticates the user using OAuth 2.0 and initializes API clients.
   */
  async initialize(): Promise<void> {
    try {
      this.oauth2Client = await this.loadSavedCredentialsIfExist();
      if (!this.oauth2Client) {
        this.oauth2Client = await this.authenticateUser();
      }
      google.options({ auth: this.oauth2Client });
      this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
      console.log('Google Docs and Drive services initialized successfully.');
    } catch (error) {
      console.error('Error initializing Google services:', error);
      throw new Error('Failed to initialize Google services.');
    }
  }

  /**
   * Loads previously saved credentials from the token file.
   */
  private async loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
    try {
      const content = await fs.promises.readFile(TOKEN_PATH, 'utf8');
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials) as OAuth2Client;
    } catch (err) {
      // If token file doesn't exist or is invalid, return null
      console.log('Token file not found or invalid, proceeding with authentication.');
      return null;
    }
  }

  /**
   * Saves credentials to a file for future use.
   */
  private async saveCredentials(client: OAuth2Client): Promise<void> {
    try {
      const content = await fs.promises.readFile(CREDENTIALS_PATH, 'utf8');
      const keys = JSON.parse(content);
      const key = keys.installed || keys.web; // Handle different credential types
      const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
      });
      await fs.promises.writeFile(TOKEN_PATH, payload);
      console.log(`Token stored to ${TOKEN_PATH}`);
    } catch (error) {
        console.error('Error saving credentials:', error);
        throw new Error('Failed to save credentials');
    }
  }

  /**
   * Initiates the OAuth 2.0 flow to get user authorization.
   */
  private async authenticateUser(): Promise<OAuth2Client> {
    console.log('Starting authentication flow...');
    const client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await this.saveCredentials(client);
      console.log('Authentication successful.');
      return client;
    }
    throw new Error('Authentication failed: No credentials received.');
  }

  // --- Placeholder Methods for Google Docs/Drive Functionality ---

  async createDocument(title: string): Promise<docs_v1.Schema$Document | undefined> {
    if (!this.docs) throw new Error('Docs service not initialized.');
    console.log(`Attempting to create document with title: ${title}`);
    // Implementation to be added
    return undefined; // Placeholder
  }

  async shareDocumentWithOrg(documentId: string, domain: string, role: string = 'writer'): Promise<drive_v3.Schema$Permission | undefined> {
      if (!this.drive) throw new Error('Drive service not initialized.');
      console.log(`Attempting to share document ${documentId} with domain ${domain}`);
      // Implementation to be added
      return undefined; // Placeholder
  }

  async readDocument(documentId: string): Promise<docs_v1.Schema$Document | undefined> {
    if (!this.docs) throw new Error('Docs service not initialized.');
    console.log(`Attempting to read document: ${documentId}`);
    // Implementation to be added
    return undefined; // Placeholder
  }

  async readDocumentText(documentId: string): Promise<string | undefined> {
      const doc = await this.readDocument(documentId);
      // Implementation to extract text to be added
      return undefined; // Placeholder
  }


  async editDocument(documentId: string, requests: docs_v1.Schema$Request[]): Promise<docs_v1.Schema$BatchUpdateDocumentResponse | undefined> {
    if (!this.docs) throw new Error('Docs service not initialized.');
    console.log(`Attempting to edit document: ${documentId}`);
    // Implementation to be added
    return undefined; // Placeholder
  }

  async rewriteDocument(documentId: string, text: string): Promise<docs_v1.Schema$BatchUpdateDocumentResponse | undefined> {
      if (!this.docs) throw new Error('Docs service not initialized.');
      console.log(`Attempting to rewrite document: ${documentId}`);
      // Implementation to be added
      return undefined; // Placeholder
  }

  async readComments(documentId: string): Promise<drive_v3.Schema$CommentList | undefined> {
      if (!this.drive) throw new Error('Drive service not initialized.');
      console.log(`Attempting to read comments for document: ${documentId}`);
      // Implementation to be added
      return undefined; // Placeholder
  }

  async createComment(documentId: string, content: string): Promise<drive_v3.Schema$Comment | undefined> {
      if (!this.drive) throw new Error('Drive service not initialized.');
      console.log(`Attempting to create comment on document: ${documentId}`);
      // Implementation to be added
      return undefined; // Placeholder
  }

  async replyComment(documentId: string, commentId: string, content: string): Promise<drive_v3.Schema$Reply | undefined> {
      if (!this.drive) throw new Error('Drive service not initialized.');
      console.log(`Attempting to reply to comment ${commentId} on document: ${documentId}`);
      // Implementation to be added
      return undefined; // Placeholder
  }

  async deleteReply(documentId: string, commentId: string, replyId: string): Promise<void | undefined> {
      if (!this.drive) throw new Error('Drive service not initialized.');
      console.log(`Attempting to delete reply ${replyId} on comment ${commentId} in document: ${documentId}`);
      // Implementation to be added
      return undefined; // Placeholder
  }
} 