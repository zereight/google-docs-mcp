Google Docs MCP 인증 설정 방법
===========================

1. Google Cloud Console에 접속: https://console.cloud.google.com/

2. 새 프로젝트 생성
   - 우측 상단의 프로젝트 선택기 → '새 프로젝트'
   - 프로젝트 이름 입력 (예: "Google Docs MCP")
   - '만들기' 클릭

3. API 라이브러리 활성화
   - 왼쪽 사이드바에서 'API 및 서비스' → 'API 라이브러리' 선택
   - "Google Docs API" 및 "Google Drive API" 검색하여 각각 활성화
   ![Google Cloud Console 스크린샷](1.png)
   

4. OAuth 동의 화면 설정
   - 왼쪽 사이드바에서 'API 및 서비스' → 'OAuth 동의 화면' 선택
   - 사용자 유형(일반적으로 '외부') 선택하고 '만들기' 클릭
   - 필수 정보 입력 (앱 이름, 사용자 지원 이메일 등)
   - 데이터 액세스 -> 범위 추가: 
     * https://www.googleapis.com/auth/documents
     * https://www.googleapis.com/auth/drive
   - '저장 후 계속' 클릭하여 나머지 단계 완료

5. 사용자 인증 정보 생성
   - 왼쪽 사이드바에서 'API 및 서비스' → '사용자 인증 정보' 선택
   - '+ 사용자 인증 정보 만들기' → 'OAuth 클라이언트 ID' 선택
   - 애플리케이션 유형: 'Desktop app' 선택
   - 이름 입력 (예: "Google Docs MCP Desktop")
   - '만들기' 클릭
   - JSON 다운로드 버튼 클릭
   ![Google Cloud Console 스크린샷](2.png)

6. 인증 파일 적용
   - 다운로드된 JSON 파일의 이름을 'credentials.json'으로 변경
   - 이 파일을 프로젝트 루트 디렉토리에 복사
   - 중요: 파일 이름은 반드시 'credentials.json'이어야 하며 프로젝트 루트 디렉토리에 직접 위치해야 합니다

7. 인증 실행
   - `npm run build` 실행하여 코드 빌드
   - `npm run auth` 실행하여 인증 프로세스 시작
   - 브라우저가 자동으로 열리고 인증 URL로 이동합니다
   - Google 계정으로 로그인하고 요청된 권한을 허용합니다
   - 인증이 완료되면 자동으로 localhost로 리디렉션되고 토큰이 저장됩니다
   - 브라우저에 성공 페이지가 표시되고 스크립트가 자동으로 종료됩니다
   - 토큰은 프로젝트 디렉토리의 `token.json` 파일에 저장됩니다

8. 서비스 실행
   - MCP 서버의 구성 파일(일반적으로 ~/.cursor/mcp.json)에 서비스를 등록합니다:
   ```json
   "google-docs": {
      "command": "node",
      "args": ["/경로/google-docs-mcp/build/index.js"],
      "env": {
        "GOOGLE_DOCS_CREDENTIALS_PATH": "/경로/google-docs-mcp/credentials.json",
        "GOOGLE_DOCS_TOKEN_PATH": "/경로/google-docs-mcp/token.json"
      }
   }
   ```
   - 경로는 실제 프로젝트 위치로 변경하세요
   - 등록 후 MCP 서버가 자동으로 서비스를 인식하여 사용할 수 있습니다