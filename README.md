# Google Docs MCP

Model Context Protocol for Google Docs integration. 이 패키지는 Google Docs 문서에 접근하고 읽고 편집하는 기능을 제공합니다.

## 설치

```bash
npm install -g google-docs-mcp
# 또는
npx google-docs-mcp
```

## 사용법

### 설정 방법

인증 파일 경로는 환경 변수를 통해 지정할 수 있습니다:

```bash
# 환경 변수 설정
export GOOGLE_DOCS_CREDENTIALS_PATH="/path/to/credentials.json"
export GOOGLE_DOCS_TOKEN_PATH="/path/to/token.json"

# 서버 실행
google-docs-mcp
```

기본 경로를 사용할 수도 있습니다:
- 자격증명 파일: `~/.google-docs-mcp-credentials.json`
- 토큰 파일: `token.json` (프로젝트 루트 디렉토리)

### 인증 설정

처음 사용 시 Google API 인증이 필요합니다:

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 생성하고 Google Docs API와 Drive API를 활성화합니다.
2. OAuth 동의 화면을 설정하고 OAuth 클라이언트 ID를 생성합니다.
3. 다운로드한 JSON 파일의 이름을 `credentials.json`으로 변경하고 환경 변수로 지정하거나 다음 위치 중 한 곳에 저장합니다:
   - 사용자 홈 디렉토리에 `.google-docs-mcp-credentials.json`으로 저장
   - 환경 변수 `GOOGLE_DOCS_CREDENTIALS_PATH`로 지정
4. `npm run auth` 명령을 실행하면 인증 URL이 표시되고 로컬 서버가 시작됩니다.
5. 브라우저에서 표시된 URL로 접속하여 인증을 완료합니다.
6. 인증 완료 후 자동으로 브라우저에 성공 페이지가 표시되고, 토큰이 프로젝트 디렉토리의 `token.json` 파일에 저장됩니다.
7. 이제 `npm run start` 명령으로 서비스를 시작할 수 있습니다.

### MCP 도구

이 패키지는 다음 MCP 도구들을 제공합니다:

- `google_docs_hello`: 기본 인사 기능
- `google_docs_read_document`: Google Docs 문서 읽기
- `google_docs_read_document_text`: Google Docs 문서 텍스트 내용만 읽기
- `google_docs_create_document`: 새 Google Docs 문서 생성
- `google_docs_edit_document`: Google Docs 문서 편집
- `google_docs_rewrite_document`: Google Docs 문서 전체 내용 재작성
- `google_docs_share_document_with_org`: 조직 도메인과 문서 공유
- `google_docs_read_comments`: 문서 댓글 읽기
- `google_docs_create_comment`: 문서에 댓글 추가
- `google_docs_reply_comment`: 댓글에 답변 추가
- `google_docs_delete_reply`: 댓글 답변 삭제

### 예제

```javascript
// 문서 읽기 예제
const { result } = await mcp.call('google_docs_read_document', {
  documentId: '1WFDzSw1t1C-83qNpgFpHxaKXXIqWALTzFxZDrlpakMU'
});
console.log(result.text);

// 문서 생성 예제
const { result } = await mcp.call('google_docs_create_document', {
  title: '새 문서 제목'
});
console.log(result.documentId);

// 문서 편집 예제
await mcp.call('google_docs_edit_document', {
  documentId: 'DOCUMENT_ID',
  requests: [
    {
      insertText: {
        text: '새로운 텍스트',
        location: {
          index: 1
        }
      }
    }
  ]
});
```

## 라이선스

MIT 