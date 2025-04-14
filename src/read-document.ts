import { GoogleDocsService } from './google-docs.service.js';

async function main() {
  try {
    const documentId = process.argv[2];
    
    if (!documentId) {
      console.error('문서 ID가 필요합니다.');
      console.error('사용법: node build/read-document.js <문서_ID>');
      process.exit(1);
    }
    
    console.log('문서 ID:', documentId);
    
    const service = new GoogleDocsService();
    await service.initialize();
    
    console.log('문서 내용 읽는 중...');
    const document = await service.readDocument(documentId);
    console.log('문서 제목:', document.title);
    
    const text = await service.readDocumentText(documentId);
    console.log('문서 텍스트:\n', text);
  } catch (error) {
    console.error('오류 발생:', error);
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
    }
    process.exit(1);
  }
}

main(); 