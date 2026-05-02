# Testing Scenario: Edge Cases

This document addresses non-standard conditions and boundary testing.

## 1. Network & Wallet States

### 1.1 Disconnected State
- **Actions**: Access a tournament page without connecting a wallet.
- **Expected**: 
    - Join button shows "Connect Wallet" or equivalent.
    - Balance section shows "Not connected".

### 1.2 Multi-Wallet Switch
- **Actions**: Connect Wallet A, join. Switch to Wallet B in the extension.
- **Expected**:
    - UI updates instantly to show "Join" button for Wallet B.
    - Balance updates to show Wallet B's USDC.

## 2. Tournament Configuration

### 2.1 Free Entry Tournaments
- **Condition**: `entryFee === 0`.
- **Expected**:
    - Button says "Join Tournament — Free".
    - No "Insufficient Balance" checks are triggered.
    - Transaction completes with 0 USDC transfer.

### 2.2 Extreme Participant Counts
- **Scenario**: 128 participants (Max).
- **Expected**:
    - Bracket rendering remains performant.
    - Sidebar scrolling handles the long list of participants correctly.

## 3. Data Synchronization

### 3.1 Slow Indexer
- **Scenario**: Transaction confirmed on-chain but indexer hasn't updated yet.
- **Expected**:
    - Local `joined` state keeps the button as "Registered" to prevent double-join attempts.
    - `refreshBalance` provides immediate feedback on the spend.
