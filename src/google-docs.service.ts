import { google, docs_v1, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

export class GoogleDocsService {
  private docsClient!: docs_v1.Docs;
  private driveClient!: drive_v3.Drive;
  private oAuth2Client!: OAuth2Client;
  private readonly tokenPath: string;
  private readonly credentialsPath: string;
  private readonly fallbackCredentialsPath: string;

  constructor(customCredentialsPath?: string, customTokenPath?: string) {
    const userHomeDir = os.homedir();
    
    // Apply priority: Environment variables > custom paths > default paths
    this.tokenPath = 
      process.env.GOOGLE_DOCS_TOKEN_PATH || 
      customTokenPath || 
      path.join(process.cwd(), 'token.json');
    
    this.credentialsPath = 
      process.env.GOOGLE_DOCS_CREDENTIALS_PATH || 
      customCredentialsPath || 
      path.join(userHomeDir, '.google-docs-mcp-credentials.json');
    
    // Fallback to look for credentials.json in the current directory as well
    this.fallbackCredentialsPath = path.join(process.cwd(), 'credentials.json');
    
    console.log(`Initializing GoogleDocsService: 
    - Credentials path: ${this.credentialsPath}
    - Token path: ${this.tokenPath}
    - Fallback path: ${this.fallbackCredentialsPath}`);
  }

  async initialize(): Promise<void> {
    try {
      // First, try finding credentials.json in the home directory
      let credentialsPath = this.credentialsPath;
      
      // If not in home directory, look in the current directory
      if (!fs.existsSync(this.credentialsPath) && fs.existsSync(this.fallbackCredentialsPath)) {
        credentialsPath = this.fallbackCredentialsPath;
        // On first run, copy credentials.json to the home directory
        try {
          const credentialsData = await fs.promises.readFile(this.fallbackCredentialsPath, 'utf-8');
          await fs.promises.writeFile(this.credentialsPath, credentialsData);
          console.log(`Copied credentials.json to ${this.credentialsPath}.`);
        } catch (copyError) {
          console.error('Failed to copy credentials.json:', copyError);
        }
      }
      
      const credentials = JSON.parse(
        await fs.promises.readFile(credentialsPath, 'utf-8')
      );

      const { client_secret, client_id, redirect_uris } = credentials.installed;
      this.oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      try {
        const token = JSON.parse(
          await fs.promises.readFile(this.tokenPath, 'utf-8')
        );
        this.oAuth2Client.setCredentials(token);
        await this.setupClients();
        console.log('Authentication successful using stored token.');
      } catch (err) {
        // If token reading fails, need to get a new token
        return await this.getNewToken();
      }
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  private async getNewToken(): Promise<void> {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    // Print prominently
    console.log('\n\n');
    console.log('='.repeat(80));
    console.log('Authentication required!');
    console.log('='.repeat(80));
    console.log('Please visit the following URL to authenticate:');
    console.log('\x1b[1;36m%s\x1b[0m', authUrl); // Highlight in cyan
    console.log('\nTo proceed with authentication, run the `npm run auth` command.');
    console.log('='.repeat(80));
    console.log('\n\n');
    
    // Wait briefly to ensure the URL is displayed before throwing the error
    await new Promise(resolve => setTimeout(resolve, 500));
    
    throw new Error('Authentication required. Please run the `npm run auth` command to complete authentication.');
  }

  async setAuthCode(code: string): Promise<boolean> {
    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);
      await fs.promises.writeFile(this.tokenPath, JSON.stringify(tokens));
      await this.setupClients();
      return true;
    } catch (error) {
      console.error('Failed to set authorization code:', error);
      throw error;
    }
  }

  private async setupClients(): Promise<void> {
    this.docsClient = google.docs({ version: 'v1', auth: this.oAuth2Client });
    this.driveClient = google.drive({ version: 'v3', auth: this.oAuth2Client });
  }

  async createDocument(title: string): Promise<string> {
    if (!title) {
      throw new Error('Document title is required.');
    }

    const document = await this.docsClient.documents.create({
      requestBody: {
        title,
      },
    });

    return document.data.documentId || '';
  }

  async readDocument(documentId: string): Promise<any> {
    if (!documentId) {
      throw new Error('Document ID is required.');
    }

    const document = await this.docsClient.documents.get({
      documentId,
    });

    return document.data;
  }

  async editDocument(documentId: string, requests: docs_v1.Schema$Request[]): Promise<any> {
    if (!documentId) {
      throw new Error('Document ID is required.');
    }

    if (!requests || requests.length === 0) {
      throw new Error('Edit requests are required.');
    }

    const result = await this.docsClient.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });

    return result.data;
  }

  async shareDocumentWithOrg(documentId: string, domain: string, role?: string): Promise<any> {
    if (!documentId || !domain) {
      throw new Error('Document ID and domain are required.');
    }

    const permission = {
      type: 'domain',
      role: role || 'reader',
      domain,
    };

    const result = await this.driveClient.permissions.create({
      fileId: documentId,
      requestBody: permission,
    });

    return result.data;
  }

  async readDocumentText(documentId: string): Promise<string> {
    const document = await this.readDocument(documentId);
    let text = '';
    
    if (document.body?.content) {
      document.body.content.forEach((element: any) => {
        if (element.paragraph) {
          element.paragraph.elements?.forEach((paragraphElement: any) => {
            if (paragraphElement.textRun?.content) {
              text += paragraphElement.textRun.content;
            }
          });
        }
      });
    }
    
    return text;
  }

  /**
   * Updates the entire content of a Google Docs document.
   * Replaces existing content with the provided text.
   * @param documentId The ID of the document to update.
   * @param content The new content for the document.
   * @returns The result of the batchUpdate operation.
   */
  async updateDocument(documentId: string, content: string): Promise<any> {
    if (!documentId) {
      throw new Error('Document ID is required.');
    }
    if (content === undefined || content === null) {
        throw new Error('Content to update is required.');
    }
    
    // Determine the length of the document to delete the entire content.
    // Start index is 1 for Google Docs API.
    const documentLength = await this.getDocumentLength(documentId);
    
    const requests: docs_v1.Schema$Request[] = [];

    // Only add delete request if document is not empty (length > 1, as index starts at 1)
    if (documentLength > 1) {
        requests.push({
            deleteContentRange: {
                // Delete everything except the first implicit paragraph ending.
                range: {
                    startIndex: 1,
                    endIndex: documentLength,
                },
            },
        });
    }
    
    // Only add insert request if there is content to insert.
    if (content.length > 0) {
        requests.push({
            insertText: {
                // Insert at the beginning of the document.
                location: {
                    index: 1,
                },
                text: content,
            },
        });
    }
    
    // If there are no requests (e.g., updating an empty doc with empty content), just return.
    if (requests.length === 0) {
        console.log("No update needed for document:", documentId);
        return { message: "No update needed." };
    }

    console.log(`Updating document ${documentId}...`);
    const result = await this.docsClient.documents.batchUpdate({
      documentId,
      requestBody: {
        requests,
      },
    });
    console.log(`Document ${documentId} updated successfully.`);
    return result.data;
  }

  /**
   * Updates the title of a Google Docs document.
   * @param documentId The ID of the document (file ID in Drive) to update.
   * @param newTitle The new title for the document.
   * @returns The result of the Drive file update operation.
   */
  async updateDocumentTitle(documentId: string, newTitle: string): Promise<any> {
    if (!documentId) {
      throw new Error('Document ID is required.');
    }
    if (!newTitle) {
        throw new Error('New title is required.');
    }

    console.log(`Updating title for document ${documentId} to "${newTitle}"...`);
    try {
      const result = await this.driveClient.files.update({
        fileId: documentId,
        requestBody: {
          name: newTitle,
        },
      });
      console.log(`Document ${documentId} title updated successfully.`);
      return result.data;
    } catch (error) {
        console.error(`Failed to update title for document ${documentId}:`, error);
        if (error instanceof Error) {
          throw new Error(`Failed to update document title: ${error.message}`);
        }
        throw new Error('Failed to update document title.');
    }
  }

  async rewriteDocument(documentId: string, text: string): Promise<any> {
    const requests = [
      {
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: await this.getDocumentLength(documentId),
          },
        },
      },
      {
        insertText: {
          location: {
            index: 1,
          },
          text,
        },
      },
    ];

    return this.editDocument(documentId, requests);
  }

  private async getDocumentLength(documentId: string): Promise<number> {
    const document = await this.readDocument(documentId);
    let length = 1;

    if (document.body?.content) {
      document.body.content.forEach((element: any) => {
        if (element.paragraph) {
          element.paragraph.elements?.forEach((paragraphElement: any) => {
            if (paragraphElement.textRun?.content) {
              length += paragraphElement.textRun.content.length;
            }
          });
        }
      });
    }

    return length;
  }

  async readComments(documentId: string): Promise<any> {
    if (!documentId) {
      throw new Error('Document ID is required.');
    }

    const result = await this.driveClient.comments.list({
      fileId: documentId,
      fields: '*',
    });

    return result.data;
  }

  async createComment(documentId: string, content: string): Promise<any> {
    if (!documentId || !content) {
      throw new Error('Document ID and comment content are required.');
    }

    const result = await this.driveClient.comments.create({
      fileId: documentId,
      requestBody: {
        content,
      },
    });

    return result.data;
  }

  async replyComment(documentId: string, commentId: string, content: string): Promise<any> {
    if (!documentId || !commentId || !content) {
      throw new Error('Document ID, comment ID, and reply content are required.');
    }

    const result = await this.driveClient.replies.create({
      fileId: documentId,
      commentId,
      requestBody: {
        content,
      },
    });

    return result.data;
  }

  async deleteReply(documentId: string, commentId: string, replyId: string): Promise<void> {
    if (!documentId || !commentId || !replyId) {
      throw new Error('Document ID, comment ID, and reply ID are required.');
    }

    await this.driveClient.replies.delete({
      fileId: documentId,
      commentId,
      replyId,
    });
  }

  // Added function to manually handle the authentication code
  public async manualAuthWithCode(code: string): Promise<boolean> {
    try {
      if (!this.oAuth2Client) {
        // Initialize oAuth2Client if not already done (e.g., if constructor failed)
        const credentials = JSON.parse(
          await fs.promises.readFile(this.credentialsPath, 'utf-8')
        );

        const { client_secret, client_id, redirect_uris } = credentials.installed;
        this.oAuth2Client = new google.auth.OAuth2(
          client_id,
          client_secret,
          redirect_uris[0]
        );
      }

      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);
      
      // Save the token
      await fs.promises.writeFile(this.tokenPath, JSON.stringify(tokens));
      console.log('Token saved to:', this.tokenPath);
      
      // Set up clients
      this.docsClient = google.docs({ version: 'v1', auth: this.oAuth2Client });
      this.driveClient = google.drive({ version: 'v3', auth: this.oAuth2Client });
      
      return true;
    } catch (error) {
      console.error('Failed to process authentication code:', error);
      throw error;
    }
  }
} 