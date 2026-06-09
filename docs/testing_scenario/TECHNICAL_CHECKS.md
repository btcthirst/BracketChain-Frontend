# Testing Scenario: Technical Checks

This document defines the system-level checks to ensure codebase health and deployment readiness.

## 1. Static Analysis

### 1.1 Type Checking
- **Command**: `make type-check` or `npm run type-check`.
- **Criteria**: Zero errors from `tsc`. No implicit `any` in new components.

### 1.2 Linting
- **Command**: `make lint`.
- **Criteria**: 
    - No `@typescript-eslint/no-explicit-any` errors.
    - No unused imports.
    - Standard project formatting (Prettier) is applied.

## 2. Build Pipeline

### 2.1 Production Build
- **Command**: `make build`.
- **Criteria**:
    - Compiled successfully.
    - No "BigInt literals" errors (Target ES2020 must be active in `tsconfig.json`).
    - Bundle size is within reasonable limits.

## 3. SDK Integration

### 3.1 Error Mapping
- **Condition**: Deliberately trigger an on-chain error (e.g., re-joining).
- **Expected**: `mapError` utility correctly translates Anchor/Program errors into human-readable messages.
- **Verification**: Check that raw hex codes are not shown to the end user.
