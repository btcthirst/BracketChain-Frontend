---
name: Privy
description: Use when building wallet infrastructure, authenticating users, managing embedded wallets, signing transactions, configuring access controls and policies, or integrating blockchain functionality into web and mobile applications
metadata:
    mintlify-proj: privy
    version: "1.0"
---

# Privy Skill

## Product summary

Privy is a wallet infrastructure and authentication platform that enables developers to embed self-custodial wallets and user authentication into applications. Use Privy to onboard users with email, social, or wallet-based login; create and manage embedded wallets across 50+ blockchains (Ethereum, Solana, Base, etc.); sign transactions; and enforce granular access controls and policies. Access Privy via client-side SDKs (React, React Native, Swift, Android, Flutter, Unity), server-side SDKs (Node.js, Go, Java, Rust, Ruby), or REST API. Key files: `PrivyProvider` (React), `PrivyClient` (Node.js), API endpoints at `https://api.privy.io/v1/`. Get your app ID and app secret from the Privy Dashboard at https://dashboard.privy.io/.

## When to use

Reach for this skill when:

- **Building user authentication**: Integrating email, SMS, social login (Google, Discord, Twitter, Farcaster), passkeys, or wallet-based authentication into your app
- **Creating embedded wallets**: Provisioning self-custodial wallets for users automatically or on-demand, with keys secured in Privy's infrastructure
- **Signing and sending transactions**: Executing blockchain transactions from user wallets or server-managed wallets across EVM and Solana chains
- **Configuring wallet controls**: Setting up owners, signers, authorization keys, key quorums, and policies to control who can take actions with wallets
- **Managing users and accounts**: Creating users, linking multiple authentication methods, managing linked accounts, and storing custom metadata
- **Handling wallet actions**: Executing transfers, swaps, earn deposits, or other wallet operations with built-in quote and status tracking
- **Integrating external wallets**: Connecting MetaMask, Phantom, Rainbow, or other third-party wallets to your app
- **Funding wallets**: Setting up fiat onramps, bank deposits, or crypto deposit addresses for users
- **Building trading or fintech apps**: Creating apps that require transaction signing, policy enforcement, and multi-party approvals
- **Deploying agent wallets**: Setting up wallets for autonomous agents or bots with strict policy controls

## Quick reference

### SDK initialization

| Platform | Code |
|----------|------|
| **React** | `<PrivyProvider appId="..." clientId="..." config={{embeddedWallets: {ethereum: {createOnLogin: 'users-without-wallets'}}}}>{children}</PrivyProvider>` |
| **Node.js** | `const privy = new PrivyClient({appId: '...', appSecret: '...'})` |
| **REST API** | `curl -H "Authorization: Basic <encoded>" -H "privy-app-id: <app-id>" https://api.privy.io/v1/wallets` |

### Common API endpoints

| Task | Endpoint | Method |
|------|----------|--------|
| Create wallet | `/v1/wallets` | POST |
| Get wallet | `/v1/wallets/{wallet_id}` | GET |
| Send transaction (EVM) | `/v1/wallets/{wallet_id}/rpc` | POST |
| Create user | `/v1/users` | POST |
| Get user | `/v1/users/{user_id}` | GET |
| Create policy | `/v1/policies` | POST |
| Get policy | `/v1/policies/{policy_id}` | GET |

### React hooks (client-side)

| Hook | Purpose |
|------|---------|
| `usePrivy()` | Access auth state, login/logout, ready status |
| `useWallets()` | Get connected wallets, create wallets |
| `useSendTransaction()` | Send transactions from embedded wallet |
| `useLoginWithEmail()` | Email OTP authentication |
| `useLoginWithWallet()` | Wallet-based authentication |

### Node.js SDK methods

| Method | Purpose |
|--------|---------|
| `privy.wallets().create()` | Create a new wallet |
| `privy.wallets().ethereum().sendTransaction()` | Send EVM transaction |
| `privy.wallets().solana().signAndSendTransaction()` | Send Solana transaction |
| `privy.users().create()` | Create a user |
| `privy.users().get()` | Fetch user by ID |

## Decision guidance

### When to use client-side vs server-side SDKs

| Scenario | Use Client SDK | Use Server SDK |
|----------|---|---|
| User login and embedded wallet creation | ✓ | |
| User-initiated transactions | ✓ | |
| Server-side wallet management (treasury, agents) | | ✓ |
| Automated transactions (limit orders, rebalancing) | | ✓ |
| Creating users in bulk | | ✓ |
| Signing requests with authorization keys | | ✓ |

### When to use Privy authentication vs JWT-based auth

| Scenario | Privy Auth | JWT-based |
|----------|---|---|
| Building from scratch, no existing auth | ✓ | |
| Need multiple login methods (email, social, wallet) | ✓ | |
| Already have authentication provider (Auth0, Firebase) | | ✓ |
| Want to add wallets to existing auth system | | ✓ |

### When to use embedded vs external wallets

| Scenario | Embedded | External |
|----------|---|---|
| Onboarding new users | ✓ | |
| Seamless UX without wallet installation | ✓ | |
| Users bring existing wallets | | ✓ |
| Power users with existing balances | | ✓ |
| Self-custodial user wallets | ✓ | |

### Wallet ownership models

| Model | Owner | Use Case |
|-------|-------|----------|
| User-owned | User only | Self-custodial consumer wallets |
| User + server | User + server signers | Automated trading, limit orders |
| Application-owned | Authorization key | Treasury, trading bots, agents |
| Custodial | Licensed custodian | Account model, FBO banking |

## Workflow

### 1. Set up your Privy app

1. Go to https://dashboard.privy.io/ and create a new app
2. Copy your **app ID** and **app secret** (keep secret safe)
3. Configure login methods (email, social, wallet, etc.)
4. Set up app clients if deploying across multiple domains
5. Configure appearance (logo, colors, fonts) if using Privy UI components

### 2. Integrate authentication (client-side)

1. Wrap your app with `PrivyProvider` using your app ID and client ID
2. Use `usePrivy()` hook to access `login`, `logout`, `authenticated`, `ready` state
3. Call `login()` to trigger authentication flow
4. Wait for `ready === true` before consuming Privy state
5. Access authenticated user via `user` object from `usePrivy()`

### 3. Create and manage wallets

**For user wallets (client-side):**
1. Configure `embeddedWallets` in PrivyProvider config with `createOnLogin` strategy
2. Access wallet via `useWallets()` hook after user authenticates
3. Call `createWallet()` if not auto-created

**For server wallets (backend):**
1. Initialize `PrivyClient` with app ID and app secret
2. Call `privy.wallets().create({chain_type: 'ethereum'})` to create wallet
3. Store wallet ID for future operations
4. Optionally set owner (user ID or authorization key) for access control

### 4. Execute transactions

**From client (user wallet):**
1. Get `sendTransaction` from `useSendTransaction()` hook
2. Call `sendTransaction({to: '0x...', value: '100000'})` for EVM
3. User signs in secure enclave, transaction broadcasts automatically

**From server (backend wallet):**
1. Call `privy.wallets().ethereum().sendTransaction(walletId, {caip2: 'eip155:1', params: {transaction: {...}}})`
2. Privy signs, broadcasts, and returns transaction hash
3. Handle errors (policy_violation, insufficient_funds, etc.)

### 5. Configure controls and policies

1. Create authorization keys or key quorums for wallet owners
2. Create policies via API or dashboard with rules (spending limits, allowlisted addresses, etc.)
3. Attach policy to wallet via `PATCH /v1/wallets/{wallet_id}`
4. For sensitive operations, require authorization signatures in request headers
5. Test policy enforcement with transactions that should be blocked

### 6. Handle webhooks and events

1. Configure webhook endpoints in dashboard
2. Subscribe to events (user.created, wallet.funds_deposited, transaction.confirmed, etc.)
3. Verify webhook signatures using your app secret
4. Process events asynchronously (don't block webhook response)
5. Implement retry logic for failed webhook deliveries

## Common gotchas

- **Missing `ready` check**: Always wait for `usePrivy().ready === true` before accessing wallet state or calling hooks. Accessing state before ready can return stale data.
- **Forgetting `PrivyProvider` wrapper**: All components using Privy hooks must be wrapped by `PrivyProvider`. Hooks called outside the provider will fail.
- **Incorrect CAIP2 chain IDs**: Use correct CAIP2 format (e.g., `eip155:1` for Ethereum mainnet, `eip155:11155111` for Sepolia). Wrong format causes transaction failures.
- **Policy violations silently blocking transactions**: Transactions blocked by policies return `policy_violation` error. Review policy rules in dashboard if transactions fail unexpectedly.
- **Insufficient gas credits**: Gas sponsorship requires active credits. Monitor gas balance in dashboard and enable automated refill to avoid `insufficient_funds` errors.
- **Authorization signature mismatches**: Signature payload must match request exactly (URL, method, body, headers). Even whitespace differences invalidate signatures.
- **Expired user session keys**: User signing keys are time-bound. Request fresh keys before they expire; use `AuthorizationContext` in SDKs for automatic refresh.
- **Not handling rate limits**: API endpoints are rate-limited. Implement exponential backoff retry logic and batch requests where possible.
- **Storing app secret in client code**: App secret must only be used server-side. Never expose in frontend code or environment variables accessible to clients.
- **Forgetting to set owner on production wallets**: Wallets without owners can be modified by anyone with API access. Always set authorization keys or key quorums as owners for production resources.

## Verification checklist

Before submitting work with Privy:

- [ ] App ID and app secret are correctly configured (secret not exposed in client code)
- [ ] `PrivyProvider` wraps all components using Privy hooks
- [ ] Code waits for `ready === true` before accessing wallet state
- [ ] All CAIP2 chain IDs are correctly formatted (e.g., `eip155:1`)
- [ ] Wallets have appropriate owners set (authorization keys or key quorums)
- [ ] Policies are attached to wallets and rules are tested
- [ ] Error handling covers `policy_violation`, `insufficient_funds`, `transaction_broadcast_failure`
- [ ] Authorization signatures are included in headers for protected endpoints
- [ ] Webhook endpoints are configured and signatures are verified
- [ ] Gas sponsorship credits are monitored (if using gas sponsorship)
- [ ] Rate limit retry logic is implemented
- [ ] User session keys are refreshed before expiry (or using `AuthorizationContext`)
- [ ] Transactions are tested on testnet before production deployment

## Resources

- **Comprehensive navigation**: https://docs.privy.io/llms.txt — Full page-by-page index of all Privy documentation
- **Key concepts**: https://docs.privy.io/basics/key-concepts — Core architecture and wallet control models
- **API reference**: https://docs.privy.io/api-reference/introduction — Complete REST API documentation
- **React quickstart**: https://docs.privy.io/basics/react/quickstart — Get started with React in 5 minutes
- **Node.js quickstart**: https://docs.privy.io/basics/nodeJS/quickstart — Get started with backend SDK

---

> For additional documentation and navigation, see: https://docs.privy.io/llms.txt