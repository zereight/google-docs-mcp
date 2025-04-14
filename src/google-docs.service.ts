import { google, docs_v1, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';

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

  constructor() {
    const projectRoot = process.cwd();
    this.tokenPath = path.join(projectRoot, 'token.json');
    this.credentialsPath = path.join(projectRoot, 'credentials.json');
  }

  async initialize(): Promise<void> {
    try {
      const credentials = JSON.parse(
        await fs.promises.readFile(this.credentialsPath, 'utf-8')
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
        console.log('인증 완료: 저장된 토큰 사용');
      } catch (err) {
        return await this.getNewToken();
      }
    } catch (error) {
      console.error('초기화 실패:', error);
      throw error;
    }
  }

  private async getNewToken(): Promise<void> {
    const authUrl = this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('인증 URL로 이동하여 인증을 진행해주세요:');
    console.log(authUrl);
    throw new Error('인증이 필요합니다. google_docs_auth 도구로 인증 코드를 입력해주세요.');
  }

  async setAuthCode(code: string): Promise<boolean> {
    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);
      await fs.promises.writeFile(this.tokenPath, JSON.stringify(tokens));
      await this.setupClients();
      return true;
    } catch (error) {
      console.error('인증 코드 설정 실패:', error);
      throw error;
    }
  }

  private async setupClients(): Promise<void> {
    this.docsClient = google.docs({ version: 'v1', auth: this.oAuth2Client });
    this.driveClient = google.drive({ version: 'v3', auth: this.oAuth2Client });
  }

  async createDocument(title: string): Promise<string> {
    if (!title) {
      throw new Error('문서 제목이 필요합니다.');
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
      throw new Error('문서 ID가 필요합니다.');
    }

    const document = await this.docsClient.documents.get({
      documentId,
    });

    return document.data;
  }

  async editDocument(documentId: string, requests: docs_v1.Schema$Request[]): Promise<any> {
    if (!documentId) {
      throw new Error('문서 ID가 필요합니다.');
    }

    if (!requests || requests.length === 0) {
      throw new Error('수정 요청이 필요합니다.');
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
      throw new Error('문서 ID와 도메인이 필요합니다.');
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
      throw new Error('문서 ID가 필요합니다.');
    }

    const result = await this.driveClient.comments.list({
      fileId: documentId,
      fields: '*',
    });

    return result.data;
  }

  async createComment(documentId: string, content: string): Promise<any> {
    if (!documentId || !content) {
      throw new Error('문서 ID와 댓글 내용이 필요합니다.');
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
      throw new Error('문서 ID, 댓글 ID, 답글 내용이 필요합니다.');
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
      throw new Error('문서 ID, 댓글 ID, 답글 ID가 필요합니다.');
    }

    await this.driveClient.replies.delete({
      fileId: documentId,
      commentId,
      replyId,
    });
  }

  // 수동으로 인증 코드를 처리하는 함수 추가
  public async manualAuthWithCode(code: string): Promise<boolean> {
    try {
      if (!this.oAuth2Client) {
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
      
      // 토큰 저장
      await fs.promises.writeFile(this.tokenPath, JSON.stringify(tokens));
      console.log('토큰이 저장되었습니다:', this.tokenPath);
      
      // 클라이언트 설정
      this.docsClient = google.docs({ version: 'v1', auth: this.oAuth2Client });
      this.driveClient = google.drive({ version: 'v3', auth: this.oAuth2Client });
      
      return true;
    } catch (error) {
      console.error('인증 코드 처리 실패:', error);
      throw error;
    }
  }
} 