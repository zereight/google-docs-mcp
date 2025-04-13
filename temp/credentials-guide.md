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
   - 이 파일을 프로젝트 루트 디렉토리에 이동
   
7. 어플리케이션 실행
   - 터미널에서 프로젝트 디렉토리로 이동
   - `npm run build` 실행
   - `npm start` 실행
   - 첫 실행 시 브라우저가 열리고 Google 계정 로그인을 요청할 것입니다
   - 권한을 부여하면 인증 토큰이 자동으로 `~/.google_docs_mcp_token.json`에 저장됩니다

참고: 테스트 계정으로만 OAuth 동의 화면이 설정된 경우, 테스트 사용자로 추가된 계정만 인증할 수 있습니다. 