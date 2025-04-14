import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import os from 'os';
import http from 'http';
import url from 'url';
import open from 'open';

// 인증 범위 정의
const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
];

// 토큰 저장 경로
const tokenPath = path.join(process.cwd(), 'token.json');

// 성공 페이지 HTML
const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Google Docs MCP 인증 성공</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      background-color: #f5f5f5;
      border-radius: 5px;
      padding: 20px;
      margin-top: 30px;
    }
    h1 {
      color: #4285f4;
    }
    .success {
      color: #0f9d58;
      font-weight: bold;
    }
    .code {
      background-color: #f1f1f1;
      padding: 10px;
      border-radius: 4px;
      font-family: monospace;
      margin: 10px 0;
    }
    .next-steps {
      margin-top: 30px;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <h1>Google Docs MCP 인증 완료</h1>
  <div class="container">
    <p class="success">✅ 인증이 성공적으로 완료되었습니다!</p>
    <p>인증 토큰이 다음 위치에 저장되었습니다:</p>
    <div class="code">TOKEN_PATH</div>
    
    <div class="next-steps">
      <h2>다음 단계</h2>
      <p>이제 다음 명령어로 Google Docs MCP를 실행할 수 있습니다:</p>
      <div class="code">npm run start</div>
      <p>이 창은 안전하게 닫으셔도 됩니다.</p>
    </div>
  </div>
</body>
</html>
`;

async function main() {
  try {
    // 자격 증명 파일 경로 - 항상 현재 디렉토리의 credentials.json 사용
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    
    // 자격 증명 파일 확인
    if (!fs.existsSync(credentialsPath)) {
      throw new Error('자격 증명 파일을 찾을 수 없습니다. 먼저 credentials.json 파일을 설정해주세요.');
    }
    
    // 자격 증명 읽기
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    
    // OAuth 클라이언트 생성
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      'http://localhost:3000'  // 로컬호스트 서버를 위한 리다이렉트 URI
    );
    
    // 인증 URL 생성
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    
    // 인증 URL 표시
    console.log('='.repeat(80));
    console.log('인증 URL:');
    console.log('='.repeat(80));
    console.log(authUrl);
    console.log('='.repeat(80));
    console.log('\n브라우저에서 인증 페이지가 자동으로 열립니다.');
    console.log('인증이 완료되면 자동으로 처리됩니다. 이 창을 닫지 마세요.\n');
    
    // 브라우저에서 URL 자동으로 열기
    try {
      await open(authUrl);
      console.log('브라우저가 자동으로 열렸습니다.');
    } catch (openError) {
      console.error('브라우저를 자동으로 열지 못했습니다. 위 URL을 수동으로 복사하여 브라우저에 붙여넣으세요.');
    }
    
    // 로컬 서버 시작
    startLocalServer(oAuth2Client);
    
  } catch (error) {
    console.error('오류 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function startLocalServer(oAuth2Client: OAuth2Client) {
  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const { code } = parsedUrl.query;
      
      if (code) {
        console.log('\n✅ 인증 코드를 받았습니다. 토큰을 저장하는 중...');
        
        // 토큰 받기
        const { tokens } = await oAuth2Client.getToken(code as string);
        oAuth2Client.setCredentials(tokens);
        
        // 토큰 저장
        fs.writeFileSync(tokenPath, JSON.stringify(tokens));
        console.log(`토큰이 저장되었습니다: ${tokenPath}`);
        
        // 성공 페이지 표시
        const finalHtml = successHtml.replace('TOKEN_PATH', tokenPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(finalHtml);
        
        // 즉시 종료 알림 출력
        console.log('✅ 인증이 성공적으로 완료되었습니다!');
        console.log('이제 npm run start 명령으로 서비스를 실행할 수 있습니다.');
        
        // 서버 즉시 종료 및 프로세스 종료
        server.close();
        
        // 1초 후에 프로세스 강제 종료 (서버가 모든 연결을 닫을 시간 제공)
        setTimeout(() => {
          process.exit(0);
        }, 500);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>인증 코드가 없습니다. 인증을 다시 시도해주세요.</h1>');
        // 오류 시 3초 후 종료
        setTimeout(() => {
          process.exit(1);
        }, 3000);
      }
    } catch (error) {
      console.error('토큰 처리 중 오류 발생:', error);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>인증 처리 중 오류가 발생했습니다.</h1><p>터미널을 확인해주세요.</p>');
      // 오류 시 3초 후 종료
      setTimeout(() => {
        process.exit(1);
      }, 3000);
    }
  });
  
  const port = 3000;
  server.listen(port, () => {
    console.log(`인증 서버가 http://localhost:${port} 에서 실행 중입니다...`);
  });
}

main(); 