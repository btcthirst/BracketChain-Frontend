# Testing Scenario: Visuals & Timers

This document covers testing of the dynamic UI components and real-time updates.

## 1. Countdown Timer

### 1.1 Precision Check
- **Actions**: Observe the "Starts in" timer in the header.
- **Expected**:
    - Timer decrements exactly every 1000ms.
    - Formatting matches: `[Dd] [Hh] [Mm] [Ss]`.
    - Timer does not reset or jump on page re-renders.

### 1.2 Expiration Logic
- **Condition**: `registrationDeadline` is reached while the page is open.
- **Expected**:
    - Timer changes to **"Registration Closed"**.
    - If `onEnd` callback is triggered, the Join button should automatically disable.

## 2. Dynamic Status Messages

### 2.1 Sidebar Guidance
- **Condition**: Tournament is full, user is a participant.
- **Expected**:
    - Display message: *"Tournament is full! Waiting for organizer to start..."*.
    - Text is styled correctly (italic, small font) to not distract from main actions.

### 2.2 Progress Bar
- **Condition**: Participants join one by one.
- **Expected**:
    - The progress bar width updates smoothly (`participants/maxParticipants`).
    - Color changes (if applicable) when approaching full capacity.

## 3. Micro-animations
- **Success Confetti**: Triggers exactly once after the `joinTournament` transaction is confirmed.
- **Loading Spinners**: `Loader2` icons appear in buttons while transactions are `Pending`.
- **Transitions**: Bracket panel shifts smoothly between `BracketEmpty` and `BracketView`.
