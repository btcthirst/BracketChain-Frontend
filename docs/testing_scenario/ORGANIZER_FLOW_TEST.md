# Testing Scenario: Organizer Flow

This document details the scenarios for testing administrative actions performed by tournament organizers.

## 1. Tournament Initialization

### 1.1 Start Tournament (Full)
- **Condition**: Participants reached `maxParticipants`.
- **Steps**:
    1. Connect as the organizer wallet.
    2. Click **"Start Tournament"** (Green button).
- **Expected**:
    - Multi-chunk transaction starts (handled by SDK).
    - Status changes: `Registration` -> `PendingBracketInit` -> `Active`.
    - Bracket is generated and visible to all users.

### 1.2 Start Early (Manual Lock)
- **Condition**: 2 <= participants < maxParticipants.
- **Steps**:
    1. Click **"Start Early (Lock Bracket)"** (Purple button).
- **Expected**:
    - Tournament locks at current player count.
    - Remaining empty slots are discarded.
    - Tournament proceeds to `Active` state.

## 2. Match Management

### 2.1 Reporting Results
- **Condition**: Tournament is `Active`.
- **Steps**:
    1. Click on an active match in the bracket.
    2. Click **"Report Result"** (visible only to organizer).
    3. Enter scores and confirm transaction.
- **Expected**:
    - Winner is determined on-chain.
    - Bracket updates automatically to move the winner to the next round.
    - Match status changes to `Completed`.

## 3. Security & Permissions
- **Scenario**: Non-organizer attempts to access admin buttons.
- **Expected**:
    - "Start" and "Report Result" buttons are NOT rendered for non-organizer wallets.
    - Any direct SDK calls from unauthorized wallets should fail with a `Unauthorized` error.
