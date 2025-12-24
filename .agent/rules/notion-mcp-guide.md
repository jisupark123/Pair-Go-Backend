---
trigger: model_decision
description: when using notion mcp
---

# 효율적인 Notion 데이터 조회 가이드 (To-do & Project)

이 문서는 Notion API의 쿼리 기능 제한을 극복하고, 'To-do - 페어 바둑' 관련 태스크를 최소한의 턴과 API 호출로 조회하기 위한 표준 절차를 정의합니다.

## 1. 핵심 전략: 프로젝트 중심의 우회 조회 (Project-First Traversal)

Notion MCP는 현재 복잡한 필터 쿼리(`filter: { property: 'Relation', ... }`)를 지원하지 않습니다. 따라서 특정 프로젝트(예: Auth)에 속한 태스크를 찾을 때는 **DB 전체 검색 대신 '관계형 연결(Relation)'을 따라가는 것**이 가장 효율적입니다.

## 2. 최적화된 조회 워크플로우

### Step 1: 프로젝트 페이지 직접 타겟팅

불필요하게 'To-do' DB를 먼저 검색하지 않고, 찾고자 하는 **프로젝트 페이지**를 바로 검색합니다.

- **Tool**: `API-post-search`
- **Query**: 프로젝트명 키워드 (예: "Auth", "게임", "친구")
- **검증**: 검색 결과 중 `parent`가 '프로젝트 DB'인 항목을 선택합니다.

### Step 2: Relation ID 일괄 추출

프로젝트 페이지의 속성(Properties)에서 태스크와 연결된 **Relation 속성**을 찾아 ID 목록을 한 번에 확보합니다.

- **Target Property**: `To-do 2` (현재 설정된 속성명, ID: `rXOB`)
- **Action**: 해당 속성의 `relation` 배열에 담긴 모든 `id`를 리스트업합니다.

### Step 3: 병렬 상세 조회 (Parallel Fetching)

추출된 태스크 ID들에 대해 순차적으로 요청하지 않고, **한 번의 턴에 모든 조회 요청을 병렬로 수행**합니다.

- **Tool**: `API-retrieve-a-page`
- **Tip**: 각 툴 호출 시 `waitForPreviousTools: false` (또는 병렬 실행 모드)로 AI가 여러 개의 툴을 동시에 호출하도록 유도합니다.

---

## 3. 참조: 주요 데이터베이스 및 속성 메타데이터

_(매번 ID를 검색하는 비용을 줄이기 위한 참조 정보입니다)_

- **To-do DB ID**: `2d22aeb4-f360-80a1-aec5-f02c6a708dd1`
  - 주요 속성: `상태` (Status), `우선순위` (Select), `담당자` (People)
- **Projects DB ID**: `2d22aeb4-f360-802f-bd18-c91d5e4c0bdf`
  - 연결 속성(Relation): `To-do 2` (ID: `rXOB`)
