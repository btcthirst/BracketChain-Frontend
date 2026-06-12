# План: міграція авторизації з Solana-гаманця на Privy

Гілка: `feat/privy` · Створено: 2026-06-12

## Мета

Замінити вхід «лише через Solana-гаманець (wallet-adapter modal)» на Privy-логін
(wallet / email / sms / google / apple) зі збереженням усього on-chain функціоналу:
читання балансу, створення турніру, join, report result, oracle/bind flows.

## Архітектура — ПЕРЕГЛЯНУТО (2026-06-12)

**Початковий план** тримав `@solana/wallet-adapter-react` як шар сумісності з мостом
`PrivySolanaWalletBridge` (Privy → wallet-adapter). **Жива перевірка показала, що це не
працює:** при логіні зовнішнім гаманцем (Phantom) wallet-adapter лишається disconnected,
`useWallet().publicKey` = null → баланс не зчитується, підпис би теж упав. Міст матчив
лише гаманець з назвою "privy" і не пробрасював зовнішні.

**Нова (реалізована) архітектура:** Privy — **єдине джерело істини** стану гаманця.
- `hooks/useActiveWallet.ts` — централізований хук, що віддає активний Solana-гаманець
  з Privy `useWallets()` (`address` + об'єкт `ConnectedStandardSolanaWallet`).
- Підпис — через Privy `useSignTransaction()` (працює і для зовнішніх, і для embedded).
- `@solana/wallet-adapter-react` лишається ТІЛЬКИ як джерело RPC (`ConnectionProvider`/
  `useConnection`). `WalletProvider` і міст **видалені**.

Це згортає колишні Фази 2 (gate) і 3 (Privy-native signer) — signer одразу Privy-native.

---

## Фаза 0 — Конфіг та запуск (розблокувати застосунок)

1. Створити `.env.local` з реальним `NEXT_PUBLIC_PRIVY_APP_ID` (Privy Dashboard → App Settings).
   Без нього `PrivyProvider` кидає помилку на старті.
2. Privy Dashboard: увімкнути login methods (wallet, email, sms, google, apple),
   `walletChainType: solana-only`, додати allowed origins (`localhost:3000` + прод-домен).
3. `pnpm build` (або `pnpm dev`) — переконатися, що додаток стартує без рантайм-помилок Privy.

**Готово коли:** додаток рендериться, кнопка `Login / Signup` відкриває Privy-модалку.

---

## Фаза 1 — Долагодити UI-міграцію (прибрати рештки wallet-adapter modal)

### 1.1 `features/tournament/view/TournamentSidebar.tsx` — 🔴 битий шлях
- рядок 6: прибрати `import { useWalletModal } from "@solana/wallet-adapter-react-ui"`
- рядок 266: прибрати `useWalletModal()`; додати `const { login } = usePrivy()`
- рядок 471: `onClick={() => setWalletModalVisible(true)}` → `onClick={login}`
- Текст кнопки/підказки лишити, але «Connect a Solana wallet» → «Sign in to register».

### 1.2 `components/Providers.tsx` — прибрати мертвий код
- рядок 10: видалити `import { WalletModalProvider }`
- рядок 12: видалити `import "@solana/wallet-adapter-react-ui/styles.css"`
- рядок 117: видалити закоментований `WalletModalProvider`

### 1.3 Залежності
- Після 1.1–1.2 `@solana/wallet-adapter-react-ui` більше ніде не імпортується →
  прибрати з `package.json` + `pnpm install` (перевірити grep по всьому репо перед видаленням).

### 1.4 Аудит решти точок входу
- Перевірити, що всі «connect» CTA ведуть на Privy `login`:
  `ConnectButton` ✓, `DashboardPage` ✓, `CreateTournament/PrizeStep` (`onConnect`) ✓, sidebar (1.1).
- Grep на залишки: `useWalletModal`, `WalletMultiButton`, `setVisible`.

**Готово коли:** `pnpm build` зелений, жодних імпортів `wallet-adapter-react-ui`,
кнопка join на сторінці турніру відкриває Privy-логін.

---

## Фаза 2 — Верифікація підпису (DECISION GATE)

Тестувати наживо на devnet через `/verify` flow або вручну. Три сценарії:

| Сценарій | Логін | Очікування |
|---|---|---|
| A. Зовнішній гаманець | Phantom через Privy | `useAnchorWallet` → bridge підписує, create/join проходить |
| B. Embedded-гаманець | email/google | **перевірити** чи `useAnchorWallet().signAllTransactions` працює |
| C. Стан/баланс | будь-який | `useWalletBalance` бачить publicKey, баланс тягнеться |

**Метод перевірки для B:** залогінитись через email → `Create Tournament` →
дійти до підпису. Якщо `bridgeAnchorWalletToSigner` отримує робочий
`signAllTransactions` від embedded-гаманця і транзакція підтверджується — **Фаза 3 не потрібна**.

**Якщо B падає** (embedded-гаманець не виставляє `signAllTransactions` через wallet-adapter,
або підпис не верифікується) → переходимо до Фази 3.

**Готово коли:** A і C працюють точно; для B є чітке «так/ні».

---

## Фаза 3 — Privy-native signer для embedded (ТІЛЬКИ якщо Фаза 2-B впала)

Додати окремий шлях підпису, що не залежить від wallet-adapter:

1. Новий хук `lib/privySolanaSigner.ts` → `usePrivySolanaSigner(): TransactionModifyingSigner | null`
   - бере embedded-гаманець з `useWallets()` (`@privy-io/react-auth/solana`)
   - використовує `useSignTransaction()` → `signTransaction({ transaction, wallet })`
   - повертає Kit-сумісний `TransactionModifyingSigner` (аналог наявного `bridgeAnchorWalletToSigner`,
     але через Privy API; round-trip Kit `messageBytes` ↔ web3.js `VersionedTransaction`).
2. `lib/sdk.ts` → `useBracketChainClient`: вибір signer-а
   - якщо активний гаманець embedded (Privy) → `usePrivySolanaSigner`
   - якщо зовнішній (Phantom через адаптер) → наявний `bridgeAnchorWalletToSigner(useAnchorWallet())`
   - визначати тип за `wallets` з `useSolanaWallets()` (`walletClientType === "privy"`).
3. Перетестувати сценарій B з Фази 2.

**Готово коли:** create/join проходить і для embedded, і для зовнішнього гаманця.

---

## Фаза 4 — Onboarding embedded-гаманців (продукт)

Email/google-користувач отримує **порожній** Solana-гаманець (0 SOL/USDC) →
не може платити комісію/entry fee.

1. Devnet: документувати airdrop-флоу для тесту (або кнопка «faucet» у dev-режимі).
2. Прод: інтегрувати Privy funding (`https://docs.privy.io/wallets/funding/overview`) —
   on-ramp / deposit address. **Рішення продукту** — узгодити обсяг (можливо, поза цим PR).

---

## Фаза 5 — Поліш і прибирання

- `components/ConnectButton.tsx`: прибрати `console.log`-и (їх немає тут, але є в `Providers`).
- `components/Providers.tsx`: прибрати debug `console.log` з `PrivySolanaWalletBridge` (рядки 57/60/62/70/72).
- Звузити `loginMethods` до реально потрібних (`telegram` згадується в ConnectButton, але не в методах).
- `.env.example` вже має `NEXT_PUBLIC_PRIVY_APP_ID` ✓.
- Оновити/видалити чернетку `docs/tasks/privy_connection.md` (особистий чекліст).
- `pnpm lint` + `pnpm build` зелені.

---

## Файли, що зачіпаються

| Файл | Фаза | Дія |
|---|---|---|
| `.env.local` (новий, gitignored) | 0 | додати app id |
| `features/tournament/view/TournamentSidebar.tsx` | 1.1 | modal → Privy login |
| `components/Providers.tsx` | 1.2, 5 | прибрати modal provider + debug logs |
| `package.json` | 1.3 | прибрати `wallet-adapter-react-ui` |
| `lib/privySolanaSigner.ts` (новий) | 3 | Privy-native Kit signer (умовно) |
| `lib/sdk.ts` | 3 | вибір signer-а embedded/external (умовно) |
| `docs/tasks/privy_connection.md` | 5 | прибрати/оновити |

## Порядок виконання

Фаза 0 → 1 → **2 (gate)** → 3 (умовно) → 5. Фаза 4 — окремо/паралельно (продукт).
Найкоротший шлях до робочого стану: 0+1 дають зелений build і робочий зовнішній гаманець;
Фаза 2 вирішує, чи потрібна найдорожча Фаза 3.
