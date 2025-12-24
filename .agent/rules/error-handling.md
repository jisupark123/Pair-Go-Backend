---
trigger: always_on
---

## 에러 처리 및 로깅 가이드

### 1. 예외 처리 (Exceptions)

- 비즈니스 로직 예외 발생 시 Nest.js 내장 `HttpException` 또는 그 하위 클래스(`BadRequestException`, `NotFoundException` 등)를 사용합니다.
- 임의의 문자열 대신 명확한 에러 메시지를 전달합니다.

### 2. 로깅 (Logging)

- `console.log` 대신 Nest.js 내장 `Logger` 클래스를 사용합니다.
- 서비스의 주요 흐름(생성, 수정, 삭제)에는 반드시 로그를 남깁니다.
