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

    this.googleDocsService = new GoogleDocsService();

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[google-docs-mcp Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async initialize() {
    await this.googleDocsService.initialize();
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
          description: 'Google Docs 문서를 읽습니다.',
          inputSchema: {
            type: 'object',
            properties: {
              documentId: {
                type: 'string',
                description: '읽을 문서의 ID'
              }
            },
            required: ['documentId']
          },
          handler: async (args: any) => {
            if (typeof args?.documentId !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, '문서 ID가 필요합니다.');
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
          name: 'google_docs_auth',
          description: 'Google Docs 인증을 설정합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: '인증 코드'
              }
            },
            required: ['code']
          },
          handler: async (args: any) => {
            if (typeof args?.code !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, '인증 코드가 필요합니다.');
            }

            await this.googleDocsService.setAuthCode(args.code);
            return {
              result: {
                message: '인증이 완료되었습니다.'
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
        
        case 'google_docs_auth':
          if (typeof request.params.arguments?.code !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, '인증 코드가 필요합니다.');
          }
          await this.googleDocsService.setAuthCode(request.params.arguments.code);
          return {
            content: [{ type: 'text', text: '인증이 완료되었습니다.' }]
          };

        case 'google_docs_read_document':
          if (typeof request.params.arguments?.documentId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, '문서 ID가 필요합니다.');
          }
          const text = await this.googleDocsService.readDocumentText(request.params.arguments.documentId);
          return {
            content: [{ type: 'text', text }]
          };

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  async run() {
    try {
      console.error('GoogleDocsMcp: 인증 초기화 중...');
      await this.initialize();
      console.error('GoogleDocsMcp: 인증 초기화 완료');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('google-docs-mcp running on stdio');
    } catch (error) {
      console.error('GoogleDocsMcp 초기화 오류:', error);
      if (error instanceof Error) {
        console.error('오류 메시지:', error.message);
        console.error('오류 스택:', error.stack);
      }
    }
  }
}

const server = new GoogleDocsMcp();
server.run().catch(console.error);
