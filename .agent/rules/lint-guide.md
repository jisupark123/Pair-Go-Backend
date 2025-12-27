---
trigger: model_decision
description: when writing code
---

# Linting & Coding Standards Guide

이 프로젝트는 엄격한 ESLint 및 Prettier 규칙을 따릅니다. 코드를 작성하거나 수정할 때 아래 규칙들을 반드시 준수해야 합니다.

코드 작성 완료 후에는 항상 `pnpm lint && pnpm typecheck` 명령어를 통해 검사를 진행해야 합니다.

## 1. 기본 스타일 (Prettier & General)

- **Prettier**: 모든 코드 포맷팅은 Prettier 설정을 따릅니다 (`prettier/prettier`: error).
- **축약 구문 사용**: 객체 리터럴에서 가능한 경우 축약 구문을 사용합니다 (`object-shorthand`: always).
- **화살표 함수**:
  - 콜백 함수에서는 화살표 함수를 우선 사용합니다 (`prefer-arrow-callback`).
  - 화살표 함수의 본문이 단일 표현식인 경우 중괄호 `{}`를 생략합니다 (`arrow-body-style`: as-needed).
- **일치 연산자**: 항상 `===` 및 `!==`를 사용합니다 (`eqeqeq`: always).
- **구조 분해 할당(Destructuring)**: 객체 변수를 선언할 때는 구조 분해 할당을 사용해야 합니다 (`prefer-destructuring`).

## 2. TypeScript 규칙

- **Any 타입**: `any` 타입 사용이 금지됩니다. 구체적인 타입을 사용하세.
- **미사용 변수**: 사용하지 않는 변수는 경고(`warn`) 처리됩니다. 사용하지 않아야 하는 변수(예: 함수의 인자 등)는 이름 앞에 `_`를 붙여야 합니다 (예: `_req`, `_unused`).
- **인터페이스 & 타입 명명 규칙**:
  - Interface 이름 앞에 `I` 접두사를 붙이지 않습니다 (예: `IProps` ❌ -> `Props` ✅).
  - Type Alias 이름 앞에 `T` 접두사를 붙이지 않습니다 (예: `TState` ❌ -> `State` ✅).
  - 제네릭 타입 파라미터 등에도 `T` 접두사 패턴을 피합니다.
  - 모든 타입 정의(Interface, Type Alias, Enum)는 `PascalCase`를 사용합니다.
- **변수 및 함수 명명 규칙**:
  - 변수: `camelCase`, `PascalCase`, `UPPER_CASE` 허용.
  - 함수: `camelCase`, `PascalCase` 허용.

## 3. Import 규칙 (매우 중요)

- **경로 제한**: 상대 경로 import(`../`, `./`) 사용이 **금지**되어 있습니다. 반드시 Alias 경로(예: `@/components/...`)나 패키지 명을 사용한 절대 경로를 사용하세요 (`no-restricted-imports`).
- **Type-only Import 사용**: TypeScript의 인터페이스(Interface)나 타입(Type)을 가져올 때는 반드시 `import type` 구문을 사용하여 런타임 번들 크기를 최적화하고 의존성을 명확히 합니다.
- **Import 정렬 (`import/order`)**:
  - **순서**: `builtin` & `external` → `internal` → `unknown` → `parent` & `sibling` → `index` 순으로 정렬합니다.
  - **그룹 간 공백**: 각 그룹 사이에는 반드시 빈 줄을 하나 둬야 합니다.
  - **React 우선**: 외부 라이브러리 중 `react` 관련 import는 가장 상단에 위치합니다.
  - **Lib 우선**: 내부 모듈 중 `@/lib/**` 경로는 다른 internal 모듈보다 먼저 위치합니다.
  - **알파벳 정렬**: 각 그룹 내에서는 대소문자 구분 없이 알파벳 순으로 정렬합니다.
