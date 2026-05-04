# Testing Scenario: Tournament Join & Lifecycle

This document outlines the manual testing procedures for the tournament join functionality, organizer controls, and related UI/UX states in the BracketChain frontend.

## 1. Join Tournament Flow

### 1.1 Successful Registration (Happy Path)
- **Prerequisites**: Wallet connected on Devnet with sufficient USDC (> entry fee) and SOL.
- **Actions**:
    1. Navigate to a tournament page in "Registration" status.
    2. Click the **"Join Tournament"** button.
    3. Approve the transaction in the wallet provider.
- **Expected Results**:
    - Button shows `Loader2` and "Awaiting wallet..." during signature.
    - Confetti effect triggers upon success.
    - Success toast appears: "Joined tournament successfully!".
    - Button state changes to **"Registered"** (disabled, green background).
    - Local USDC balance in the sidebar decreases by the entry fee amount.
    - Participant list updates to include the current wallet address.

### 1.2 User Rejection
- **Actions**:
    1. Click **"Join Tournament"**.
    2. Click "Reject" or close the wallet signature window.
- **Expected Results**:
    - Button returns to active state ("Join Tournament").
    - Info toast appears: "Request cancelled".
    - No error messages or console exceptions.

### 1.3 Insufficient Balance
- **Prerequisites**: Wallet has USDC < entry fee.
- **Expected Results**:
    - Warning banner appears: "Low balance: Your wallet has X USDC".
    - Join button is disabled and displays **"Insufficient Balance"**.
    - If forced via console, error toast appears with a link to the **Devnet USDC Faucet**.

---

## 2. Tournament Full & Empty States

### 2.1 Maximum Participants Reached
- **Scenario**: `participants.length === maxParticipants`.
- **Expected Results**:
    - Join button is disabled and displays **"Tournament Full"**.
    - If already registered, a sub-message appears: *"Tournament is full! Waiting for organizer to start..."*.
    - Empty slots in the sidebar are replaced by the last participant's info.

### 2.2 Empty Bracket (Registration Phase)
- **Expected Results**:
    - Instead of a tournament grid, the `BracketEmpty` component is shown.
    - The "Be the first to join!" button in the empty state triggers the `join-btn` click correctly.

---

## 3. Organizer Controls

### 3.1 Start Tournament (Full)
- **Prerequisites**: Logged in as the tournament organizer, tournament is full.
- **Expected Results**:
    - Sidebar shows a green **"Start Tournament"** button.
    - Clicking triggers `start_tournament` instruction via SDK.
    - Success toast appears: "Tournament started! Bracket is being initialized.".
    - Status changes from "Registration" to "In Progress".

### 3.2 Start Early (Lock Bracket)
- **Prerequisites**: Organizer, 2 <= participants < maxParticipants.
- **Expected Results**:
    - Sidebar shows a purple **"Start Early (Lock Bracket)"** button.
    - Functionality is identical to "Start Tournament", but locks the bracket at current size.

---

## 4. Visuals & Timers

### 4.1 Countdown Timer
- **Expected Results**:
    - "Starts in" countdown in the header updates every second.
    - Formatting correctly handles days, hours, minutes, and seconds.
    - When time expires, it displays "Registration Closed".

### 4.2 Post-Start Transition
- **Actions**: Successfully start the tournament.
- **Expected Results**:
    - Page refreshes/updates via subscription.
    - `BracketView` replaces `BracketEmpty`.
    - Sidebar actions change from "Start" to "Report Result" for the organizer.
