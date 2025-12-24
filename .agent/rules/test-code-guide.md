---
trigger: model_decision
description: when writing test code
---

## 테스트 코드 작성 가이드 (Unit Test)

### 1. 파일 위치 및 환경

- **파일 위치**: 테스트 파일은 테스트 대상 파일과 **같은 경로**에 작성합니다.
  - 예시: `sum.ts` → `sum.test.ts` (또는 `sum.spec.ts`)
- **프레임워크**: `jest`를 사용합니다.

### 2. 네이밍 및 스타일

- **메서드**: `it` 메서드를 사용합니다.
  - _참고: Jest는 `it`, `describe`, `expect` 등을 전역(Global)으로 제공하므로 별도의 import 없이 작성이 가능합니다._
- **테스트 명**: `it` 함수의 설명(description)은 **한글**로 명확하게 작성합니다.

### 3. 구조 및 데이터 관리

- **공통 데이터**: 반복해서 사용되는 데이터나 Mock 데이터는 테스트 파일 **최상단**에 정의하여 재사용합니다.
- **공통 로직**: 테스트 실행 전후에 필요한 공통 작업(초기화, 리셋 등)은 `beforeEach`, `beforeAll`, `afterEach` 등의 훅(Hook) 메서드를 적극 활용합니다.

### 4. 테스트 실행 및 검증

- **실행**: 테스트 작성 후에는 아래 명령어로 해당 파일의 정상 작동 여부를 확인합니다.
  ```bash
  npx jest <파일경로>
  ```
