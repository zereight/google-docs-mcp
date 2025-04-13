#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

class GoogleDocsMcp {
  private server: Server;

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

    this.setupToolHandlers();

    this.server.onerror = (error) => console.error('[google-docs-mcp Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
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
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'hello') {
        const name = request.params.arguments?.name;
        return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
      }
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('google-docs-mcp running on stdio');
  }
}

const server = new GoogleDocsMcp();
server.run().catch(console.error);
