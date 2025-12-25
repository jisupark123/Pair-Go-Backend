# Prisma 스키마 변경 워크플로우 가이드

`prisma/schema.prisma` 파일을 수정한 후, 변경 사항을 데이터베이스와 프로젝트 코드에 반영하기 위해 아래 절차를 따르세요.

## 1. 개발 환경 (Local Development)

### 스키마 변경 적용 및 마이그레이션 생성

스키마를 수정한 후에는 반드시 마이그레이션 명령어를 실행해야 합니다. 이 명령어는 **1) SQL 마이그레이션 파일 생성**, **2) 로컬 DB에 적용**, **3) Prisma Client 재생성**을 한 번에 수행합니다.

```bash
npx prisma migrate dev --name <변경_내용_요약>
```

- 예시: `npx prisma migrate dev --name add_profile_image`
- 명령어 실행 후 `prisma/migrations` 폴더에 새로운 SQL 파일이 생성되었는지 확인하세요.

> **참고:** 단순히 `npx prisma generate`만 실행하면 TypeScript 타입은 갱신되지만, 실제 데이터베이스 구조는 변경되지 않습니다. DB 스키마를 변경했다면 반드시 `migrate dev`를 사용하세요.

---

## 2. 배포 및 운영 환경 (Production)

### CI/CD 또는 배포 서버에서의 적용

로컬에서 생성된 마이그레이션 파일(`prisma/migrations/*`)을 Git에 커밋하여 배포 서버로 전달해야 합니다. 배포 서버에서는 **데이터 리셋 없이** 안전하게 변경 사항만 적용하는 명령어를 사용합니다.

```bash
npx prisma migrate deploy
```

> **주의:** 운영 환경에서는 `migrate dev`를 절대 사용하지 마세요. 데이터가 초기화될 위험이 있습니다.

---

## 3. 요약

| 상황                          | 명령어                      | 설명                                                       |
| :---------------------------- | :-------------------------- | :--------------------------------------------------------- |
| **개발 중 DB 구조 변경**      | `npx prisma migrate dev`    | 마이그레이션 생성 + DB 적용 + 클라이언트 재생성            |
| **코드만 재생성 (타입 갱신)** | `npx prisma generate`       | DB 변경 없이 TypeScript 타입만 새로고침 (git pull 직후 등) |
| **서버 배포**                 | `npx prisma migrate deploy` | 커밋된 마이그레이션을 운영 DB에 안전하게 적용              |
| **로컬 DB 데이터 확인**       | `npx prisma studio`         | 웹 브라우저에서 데이터 조회 및 편집 GUI 실행               |
