import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['dist', 'node_modules']),

  {
    files: ['**/*.ts'],

    plugins: { prettier: eslintPluginPrettier, import: importPlugin },
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      'prettier/prettier': 'error',

      'object-shorthand': ['error', 'always'], // 객체 리터럴에서 축약 구문 사용 강제
      'arrow-body-style': ['error', 'as-needed'], // 화살표 함수에서 불필요한 중괄호 사용 금지
      'prefer-arrow-callback': 'error', // 콜백 함수에서 화살표 함수 사용 강제
      eqeqeq: ['error', 'always'], // == 대신 === 사용 강제

      // typescript-eslint
      '@typescript-eslint/array-type': 0, // string[] 이나 Array<string> 모두 사용 허용
      '@typescript-eslint/ban-ts-comment': 0, // ts-ignore 사용 허용
      '@typescript-eslint/no-explicit-any': 'error', // any 타입 사용 금지
      '@typescript-eslint/no-var-requires': 'error', // require 사용 금지
      '@typescript-eslint/no-require-imports': 'error', // require import 사용 금지
      '@typescript-eslint/no-empty-object-type': 'error', // 빈 객체 타입 사용 금지

      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_', // _로 시작하는 인자는 미사용 허용
          varsIgnorePattern: '^_', // _로 시작하는 변수는 미사용 허용
        },
      ],

      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // 상대 경로(./ 또는 ../)로 시작하는 모든 import 제한
              group: ['./*', '../*'],
              message: "상대 경로 import 대신 절대 경로(Path Alias, 예: '@/...')를 사용해주세요.",
            },
          ],
        },
      ],

      // eslint-import
      'import/order': [
        'error',
        {
          alphabetize: {
            order: 'asc', // 알파벳 오름차순으로 정렬 (A → Z)
            caseInsensitive: true, // 대소문자 구분 없이 정렬
          },
          'newlines-between': 'always', // 각 import 그룹 간에 항상 한 줄을 띄움
          groups: [['builtin', 'external'], 'internal', 'unknown', ['parent', 'sibling'], 'index'],
          distinctGroup: false,
          pathGroups: [
            {
              pattern: '@/lib/**', // src/lib 폴더
              group: 'internal',
              position: 'before', // 다른 internal보다 먼저
            },
          ],
        },
      ],
      'import/newline-after-import': 1,
      // naming convention 규칙 설정
      '@typescript-eslint/naming-convention': [
        'error',
        // camelCase 변수, PascalCase 변수, UPPER_CASE 변수 허용
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        // camelCase 함수, PascalCase 함수 허용
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        // PascalCase 클래스, interfaces, type aliases, enums 허용
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // interface 앞에 I 사용 불가
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        // typeAlias 앞에 T 사용 불가
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
          custom: {
            regex: '^T[A-Z]',
            match: false,
          },
        },
        // typeParameter 앞에 T 사용 불가
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          custom: {
            regex: '^T[A-Z]',
            match: false,
          },
        },
      ],

      // 구조 분해 할당 강제
      'prefer-destructuring': [
        'error',
        {
          // 변수 선언 시 구조 분해 할당 강제
          VariableDeclarator: {
            array: false,
            object: true,
          },
          // 할당 시 구조 분해 할당 강제
          AssignmentExpression: {
            array: false,
            object: false,
          },
        },
      ],
    },
  },
  eslintConfigPrettier, // prettier와 충돌하는 eslint 규칙을 off (따라서 맨 마지막에 위치)
);
