#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleDocsService } from './google-docs.service.js';

class GoogleDocsMcp {
  private server: Server;
  private googleDocsService: GoogleDocsService;

  constructor() {
    this.googleDocsService = new GoogleDocsService();
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

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[google-docs-mcp Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    const googleDocsTools: Tool[] = [
      {
        name: 'google_docs_create_document',
        description: 'Creates a new Google Document.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The title for the new document.' },
          },
          required: ['title'],
        },
      },
      {
          name: 'google_docs_share_document_with_org',
          description: 'Shares a Google Document with an organization domain.',
          inputSchema: {
              type: 'object',
              properties: {
                  documentId: { type: 'string', description: 'The ID of the document to share.' },
                  domain: { type: 'string', description: 'The organization domain (e.g., example.com).' },
                  role: { type: 'string', description: 'Access role (e.g., writer, reader). Default: writer', default: 'writer' },
              },
              required: ['documentId', 'domain'],
          },
      },
      {
        name: 'google_docs_read_document',
        description: 'Reads the content of a Google Document as JSON.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'The ID of the document to read.' },
          },
          required: ['documentId'],
        },
      },
       {
          name: 'google_docs_read_document_text',
          description: 'Reads the plain text content of a Google Document.',
          inputSchema: {
              type: 'object',
              properties: {
                  documentId: { type: 'string', description: 'The ID of the document to read.' },
              },
              required: ['documentId'],
          },
      },
      {
        name: 'google_docs_edit_document',
        description: 'Applies batch updates to a Google Document.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: { type: 'string', description: 'The ID of the document to edit.' },
            requests: {
                type: 'array',
                description: 'An array of Google Docs API request objects.',
                items: { type: 'object' }
            },
          },
          required: ['documentId', 'requests'],
        },
      },
      {
          name: 'google_docs_rewrite_document',
          description: 'Rewrites the entire content of a Google Document.',
          inputSchema: {
              type: 'object',
              properties: {
                  documentId: { type: 'string', description: 'The ID of the document to rewrite.' },
                  text: { type: 'string', description: 'The new text content for the document.' },
              },
              required: ['documentId', 'text'],
          },
      },
      {
          name: 'google_docs_read_comments',
          description: 'Reads comments and replies for a Google Document.',
          inputSchema: {
              type: 'object',
              properties: {
                  documentId: { type: 'string', description: 'The ID of the document.' },
              },
              required: ['documentId'],
          },
      },
      {
          name: 'google_docs_create_comment',
          description: 'Creates a new comment on a Google Document.',
          inputSchema: {
              type: 'object',
              properties: {
                  documentId: { type: 'string', description: 'The ID of the document.' },
                  content: { type: 'string', description: 'The text content of the comment.' },
              },
              required: ['documentId', 'content'],
          },
      },
      {
          name: 'google_docs_reply_comment',
          description: 'Replies to an existing comment on a Google Document.',
          inputSchema: {
              type: 'object',
              properties: {
                  documentId: { type: 'string', description: 'The ID of the document.' },
                  commentId: { type: 'string', description: 'The ID of the comment to reply to.' },
                  content: { type: 'string', description: 'The text content of the reply.' },
              },
              required: ['documentId', 'commentId', 'content'],
          },
      },
      {
          name: 'google_docs_delete_reply',
          description: 'Deletes a reply to a comment.',
          inputSchema: {
              type: 'object',
              properties: {
                  documentId: { type: 'string', description: 'The ID of the document.' },
                  commentId: { type: 'string', description: 'The ID of the comment containing the reply.' },
                  replyId: { type: 'string', description: 'The ID of the reply to delete.' },
              },
              required: ['documentId', 'commentId', 'replyId'],
          },
      }
    ];

    const allTools: Tool[] = [
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
      ...googleDocsTools
    ];

    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: allTools,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments;

      try {
        switch (toolName) {
          case 'hello': {
            const name = args?.name;
            return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
          }
          case 'google_docs_create_document': {
            const result = await this.googleDocsService.createDocument(args?.title);
            return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_share_document_with_org': {
            const result = await this.googleDocsService.shareDocumentWithOrg(args?.documentId, args?.domain, args?.role);
            return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_read_document': {
            const result = await this.googleDocsService.readDocument(args?.documentId);
            return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_read_document_text': {
              const result = await this.googleDocsService.readDocumentText(args?.documentId);
              return { content: [{ type: 'text', text: result }] };
          }
          case 'google_docs_edit_document': {
            const result = await this.googleDocsService.editDocument(args?.documentId, args?.requests);
            return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_rewrite_document': {
              const result = await this.googleDocsService.rewriteDocument(args?.documentId, args?.text);
              return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_read_comments': {
              const result = await this.googleDocsService.readComments(args?.documentId);
              return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_create_comment': {
              const result = await this.googleDocsService.createComment(args?.documentId, args?.content);
              return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_reply_comment': {
              const result = await this.googleDocsService.replyComment(args?.documentId, args?.commentId, args?.content);
              return { content: [{ type: 'json', json: result }] };
          }
          case 'google_docs_delete_reply': {
              await this.googleDocsService.deleteReply(args?.documentId, args?.commentId, args?.replyId);
              return { content: [{ type: 'text', text: 'Reply deleted successfully.' }] };
          }
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
        }
      } catch (error: any) {
          console.error(`Error calling tool ${toolName}:`, error);
          throw new McpError(ErrorCode.InternalError, `Error executing tool ${toolName}: ${error.message || error}`);
      }
    });
  }

  async run() {
    try {
        console.log('Initializing Google Docs Service...');
        await this.googleDocsService.initialize();
        console.log('Google Docs Service initialized.');

        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('google-docs-mcp running on stdio with Google Docs tools enabled.');
    } catch(error) {
        console.error("Failed to start GoogleDocsMcp server:", error);
        process.exit(1);
    }
  }
}

const server = new GoogleDocsMcp();
server.run().catch(console.error);
