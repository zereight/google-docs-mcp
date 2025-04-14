#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleDocsService } from './google-docs.service.js';

export class GoogleDocsMcp {
  private server: Server;
  private googleDocsService: GoogleDocsService;

  constructor() {
    console.error('GoogleDocsMcp: Constructor start');
    this.server = new Server(
      {
        name: 'google-docs-mcp',
        version: '1.0.0'
      },
      {
        capabilities: {
          resources: {},
          tools: {}
        }
      }
    );
    console.error('GoogleDocsMcp: Server instance created');

    // Create GoogleDocsService instance, allowing path config via env vars
    this.googleDocsService = new GoogleDocsService();
    console.error('GoogleDocsMcp: GoogleDocsService instance created');

    this.setupToolHandlers();
    console.error('GoogleDocsMcp: Tool handlers configured');

    this.server.onerror = (error) => console.error('[google-docs-mcp Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
    console.error('GoogleDocsMcp: Constructor end');
  }

  async initialize(): Promise<void> {
    try {
      await this.googleDocsService.initialize();
    } catch (err) {
      console.error('GoogleDocsMcp: Authentication initialization failed, but server continues.');
      if (err instanceof Error) {
        console.error('- Authentication Error:', err.message);
      }
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'hello',
          description: 'Say hello',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Your name' }
            },
            required: ['name']
          }
        },
        {
          name: 'google_docs_read_document',
          description: 'Reads a Google Docs document.',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: {
                type: 'string',
                description: 'The ID of the document to read'
              }
            },
            required: ['documentId']
          },
          handler: async (args: any) => {
            if (typeof args?.documentId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Document ID is required.');
            }

            const text = await this.googleDocsService.readDocumentText(args.documentId);
            return {
              result: {
                text
              }
            };
          }
        },
        {
          name: 'google_docs_update_document',
          description: 'Updates a Google Docs document.',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: {
                type: 'string',
                description: 'The ID of the document to update'
              },
              content: {
                type: 'string',
                description: 'The new content for the document'
              }
            },
            required: ['documentId', 'content']
          },
          handler: async (args: any) => {
            if (typeof args?.documentId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Document ID is required.');
            }
            if (typeof args?.content !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Document content is required.');
            }

            await this.googleDocsService.updateDocument(args.documentId, args.content);
            return {
              result: {
                message: 'Document updated successfully.'
              }
            };
          }
        },
        {
          name: 'google_docs_update_document_title',
          description: 'Updates the title of a Google Docs document.',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: {
                type: 'string',
                description: 'The ID of the document to update the title for'
              },
              newTitle: {
                type: 'string',
                description: 'The new title for the document'
              }
            },
            required: ['documentId', 'newTitle']
          },
          handler: async (args: any) => {
            if (typeof args?.documentId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'Document ID is required.');
            }
            if (typeof args?.newTitle !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'New title is required.');
            }

            await this.googleDocsService.updateDocumentTitle(args.documentId, args.newTitle);
            return {
              result: {
                message: 'Document title updated successfully.'
              }
            };
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'hello':
          const name = request.params.arguments?.name;
          return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
        
        case 'google_docs_read_document':
          if (typeof request.params.arguments?.documentId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Document ID is required.');
          }
          console.error(`Attempting to read document: ${request.params.arguments.documentId}`);
          try {
            const document = await this.googleDocsService.readDocument(request.params.arguments.documentId);
            const text = await this.googleDocsService.readDocumentText(request.params.arguments.documentId);
            return {
              content: [
                { type: 'text', text: `Title: ${document.title}\n\n${text}` }
              ]
            };
          } catch (error) {
            console.error('Error reading document:', error);
            if (error instanceof Error) {
              throw new McpError(ErrorCode.InternalError, `Failed to read document: ${error.message}`);
            }
            throw new McpError(ErrorCode.InternalError, 'Failed to read document');
          }

        case 'google_docs_update_document':
          if (typeof request.params.arguments?.documentId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Document ID is required.');
          }
          if (typeof request.params.arguments?.content !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Document content is required.');
          }
          console.error(`Attempting to update document: ${request.params.arguments.documentId}`);
          try {
            await this.googleDocsService.updateDocument(request.params.arguments.documentId, request.params.arguments.content);
            return {
              content: [
                { type: 'text', text: 'Document updated successfully.' }
              ]
            };
          } catch (error) {
            console.error('Error updating document:', error);
            if (error instanceof Error) {
              throw new McpError(ErrorCode.InternalError, `Failed to update document: ${error.message}`);
            }
            throw new McpError(ErrorCode.InternalError, 'Failed to update document');
          }

        case 'google_docs_update_document_title':
          if (typeof request.params.arguments?.documentId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'Document ID is required.');
          }
          if (typeof request.params.arguments?.newTitle !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, 'New title is required.');
          }
          console.error(`Attempting to update title for document: ${request.params.arguments.documentId}`);
          try {
            await this.googleDocsService.updateDocumentTitle(request.params.arguments.documentId, request.params.arguments.newTitle);
            return {
              content: [
                { type: 'text', text: 'Document title updated successfully.' }
              ]
            };
          } catch (error) {
            console.error('Error updating document title:', error);
            if (error instanceof Error) {
              throw new McpError(ErrorCode.InternalError, `Failed to update document title: ${error.message}`);
            }
            throw new McpError(ErrorCode.InternalError, 'Failed to update document title');
          }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  async run() {
    try {
      console.error('GoogleDocsMcp: Initializing authentication...');
      
      // Attempt authentication initialization
      try {
        await this.initialize();
        console.error('GoogleDocsMcp: Authentication initialized successfully');
      } catch (authError) {
        console.error('GoogleDocsMcp: Error during authentication initialization:', authError instanceof Error ? authError.message : authError);
        // Continue even if auth fails
      }
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('google-docs-mcp running on stdio');
    } catch (error) {
      console.error('GoogleDocsMcp Initialization Error:', error);
      if (error instanceof Error) {
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
      }
    }
  }
}

const server = new GoogleDocsMcp();
server.run().catch(console.error);
