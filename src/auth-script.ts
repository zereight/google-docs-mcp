import { GoogleDocsService } from './google-docs.service.js';

async function main() {
  try {
    const authCode = process.argv[2];
    
    if (!authCode) {
      console.error('인증 코드가 필요합니다.');
      console.error('사용법: node build/auth-script.js <인증 코드>');
      process.exit(1);
    }
    
    console.log('인증 코드:', authCode);
    
    const service = new GoogleDocsService();
    const result = await service.manualAuthWithCode(authCode);
    
    if (result) {
      console.log('인증이 성공적으로 완료되었습니다!');
    } else {
      console.error('인증이 실패했습니다.');
    }
  } catch (error) {
    console.error('오류 발생:', error);
    if (error instanceof Error) {
      console.error('오류 메시지:', error.message);
    }
    process.exit(1);
  }
}

main(); 