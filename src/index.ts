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
    console.error('GoogleDocsMcp: 생성자 시작');
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
    console.error('GoogleDocsMcp: 서버 인스턴스 생성 완료');

    // 환경 변수를 통해 경로 설정을 받을 수 있는 GoogleDocsService 생성
    this.googleDocsService = new GoogleDocsService();
    console.error('GoogleDocsMcp: GoogleDocsService 인스턴스 생성 완료');

    this.setupToolHandlers();
    console.error('GoogleDocsMcp: 도구 핸들러 설정 완료');

    this.server.onerror = (error) => console.error('[google-docs-mcp Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
    console.error('GoogleDocsMcp: 생성자 완료');
  }

  async initialize(): Promise<void> {
    try {
      await this.googleDocsService.initialize();
    } catch (err) {
      console.error('GoogleDocsMcp: 인증 초기화 실패, 하지만 서버는 계속 실행합니다.');
      if (err instanceof Error) {
        console.error('- 인증 오류:', err.message);
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
            throw new McpError(ErrorCode.InvalidParams, '문서 ID가 필요합니다.');
          }
          console.error(`문서 읽기 시도: ${request.params.arguments.documentId}`);
          try {
            const document = await this.googleDocsService.readDocument(request.params.arguments.documentId);
            const text = await this.googleDocsService.readDocumentText(request.params.arguments.documentId);
            return {
              content: [
                { type: 'text', text: `제목: ${document.title}\n\n${text}` }
              ]
            };
          } catch (error) {
            console.error('문서 읽기 오류:', error);
            if (error instanceof Error) {
              throw new McpError(ErrorCode.InternalError, `문서 읽기 실패: ${error.message}`);
            }
            throw new McpError(ErrorCode.InternalError, '문서 읽기 실패');
          }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  async run() {
    try {
      console.error('GoogleDocsMcp: 인증 초기화 중...');
      
      // 인증 초기화 시도
      try {
        await this.initialize();
        console.error('GoogleDocsMcp: 인증 초기화 완료');
      } catch (authError) {
        console.error('GoogleDocsMcp: 인증 초기화 중 오류 발생:', authError instanceof Error ? authError.message : authError);
        // 인증 오류가 발생해도 계속 진행
      }
      
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
