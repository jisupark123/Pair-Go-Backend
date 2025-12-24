---
trigger: always_on
---

## Nest.js 개발 가이드 (Architecture)

### 1. 계층 구조 준수

- **Controller**: HTTP 요청 처리 및 응답 반환에 집중하며, 비즈니스 로직은 포함하지 않습니다.
- **Service**: 핵심 비즈니스 로직을 수행하며, @Injectable() 데코레이터를 사용합니다.
- **Module**: 관련 있는 Controller와 Service를 하나의 단위로 묶어 관리하며, 필요 시 다른 모듈을 import 합니다.

### 2. 의존성 주입 (DI)

- 클래스 내부에서 `new` 키워드로 인스턴스를 직접 생성하지 않고, **생성자 주입(Constructor Injection)**을 사용합니다.
- 예시: `constructor(private readonly userService: UserService) {}`

### 3. 데이터 전송 객체 (DTO)

- 클라이언트로부터 들어오는 데이터는 반드시 **DTO(class-validator)**를 통해 검증합니다.
- 모든 DTO 필드에는 적절한 유효성 검사 데코레이터(`@IsString()`, `@IsNumber()` 등)를 작성합니다.
