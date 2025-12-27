---
trigger: model_decision
description: when implementing or refactoring API
---

## API 문서화 가이드 (Swagger)

### 1. 데코레이터 필수 사용

- 모든 Controller 메서드에는 `@ApiOperation`, `@ApiResponse`를 작성합니다.
- 요청 본문이나 쿼리 파라미터에는 `@ApiProperty`를 사용하여 설명을 추가합니다.

### 2. 응답 정의

- 성공(200, 201)뿐만 아니라 발생 가능한 실패 케이스(400, 404, 500 등)도 `@ApiResponse`로 명시합니다.
