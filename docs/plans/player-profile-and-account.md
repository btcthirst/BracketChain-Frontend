# План: Player Profile (`/player/{wallet}`) + My Account (`/account`)

Гілка: TBD (відгалузити від `feat/privy`) · Створено: 2026-06-12

## Контекст і мотивація

Спека (`BracketChainDocs/architect/PRD §5.5`) описує публічний **Player Profile**
`/player/{wallet}` (V1) — статистика + історія турнірів за адресою. Її ще не збудовано.

Перехід на **Privy** додає другу, нову потребу, якої доки не передбачили (вони писались
під wallet-only): користувач, що зайшов через email/google, має **embedded-гаманець** без
зовнішнього додатку (Phantom) для керування ним. Тож застосунок мусить дати приватну
**My Account** сторінку для: linked-акаунтів, експорту ключа, поповнення (on-ramp), адреси.

Будуємо **обидві** сторінки.

| Сторінка | Доступ | Призначення |
|---|---|---|
| `/player/{wallet}` | публічна, read-only | статистика + історія турнірів за адресою (зі спеки) |
| `/account` | Privy-gated | linked-акаунти, адреса, export, fund, logout |

---

## Дані профілю: мок зараз → ендпоінт індексера пізніше

Індексер **не має** зворотного індексу «турніри за гравцем»:
- `listTournaments` фільтрує лише `status`/`limit` (участь не видно).
- Участь/призи — тільки через `getParticipants`/`getPayouts` **по кожному** турніру.

Клієнтська агрегація (перебір усіх турнірів + N запитів) не масштабується. Рішення —
новий ендпоінт індексера, але поки його немає — **мокаємо**, щоб не блокувати UI.

**Цільовий контракт (планований, репо BracketChain-Indexer, поза цим репо):**
```
GET /players/:wallet  →  IndexerPlayer {
  stats: { played, wins, losses, winRate, totalEarnedMicro: string },
  history: Array<{
    tournamentAddress, name, game, format,
    placement: number | null, prizeMicro: string, date, status
  }>
}
```

**Мок-шар (зараз):**
- `lib/mocks/playerProfile.ts` → `mockPlayer(wallet): IndexerPlayer` — **детермінований**
  за хешем адреси (стабільний для однієї адреси між рендерами/сесіями): кілька синтетичних
  рядків історії, узгоджені stats (wins+losses=played, winRate похідний, earned зі «здобутих» місць).
- Перемикач `lib/playerSource.ts` → `getPlayer(wallet)`:
  - якщо `NEXT_PUBLIC_MOCK_PLAYER_PROFILE !== "false"` (дефолт зараз) → `mockPlayer()`
  - інакше → `BracketChainIndexerClient.getPlayer()` проти реального ендпоінта.
- Тип `IndexerPlayer` визначаємо в `lib/indexerClient.ts` **зараз** (єдина форма для мока і
  для майбутнього ендпоінта) → заміна = прибрати прапорець, нуль змін у UI/хуках.
- Мок-рядки візуально маркуємо (напр. бейдж «demo») або лишаємо TODO — узгодити, чи показувати
  мітку користувачу.

Параметр у плані: **узгодити контракт `/players/:wallet` з власником індексера** — але це вже
НЕ блокер; Фаза 2 будується на моку й перемикається прапорцем.

---

## Фаза 1 — Каркас роутів і навігація

1. `constants/links.ts` → `ROUTES`: додати
   `player: (wallet: string) => \`/player/${wallet}\``, `account: "/account"`.
2. `app/player/[wallet]/page.tsx` — тонкий server-wrapper + `metadata`, рендерить
   `features/player/PlayerProfilePage.tsx` (за конвенцією dashboard/explore).
3. `app/account/page.tsx` — wrapper → `features/account/AccountPage.tsx`.
4. Навігація:
   - `ConnectButton` дропдаун: додати пункти **My Account** (`/account`) і
     **Public Profile** (`/player/{myAddress}`), поряд з Dashboard.
   - `TournamentSidebar` Organizer Info + адреси учасників → лінк на `/player/{wallet}`
     (реалізує посилання, які згадані у спеці §5.2).

---

## Фаза 2 — Public Player Profile `/player/{wallet}`

`features/player/PlayerProfilePage.tsx` (read-only, не потребує логіну).

**Дані:** `hooks/usePlayerProfile(wallet)` → `getPlayer(wallet)` з `lib/playerSource.ts`
(мок зараз, ендпоінт пізніше — див. розділ «Дані профілю»). Патерн reducer+AbortController
як в `useDashboard`. UI не знає про мок — працює лише з типом `IndexerPlayer`.

**Layout (зі спеки §5.5):**
- Хедер: аватар (jazzicon, див. Фаза 4) + адреса (truncated, `shortenAddress`) з
  **кнопкою копіювання** (винести спільний `CopyButton` з логіки в `ConnectButton`).
- Stats row: Played / Wins / Losses / Win Rate % / Total Earned ($) — `totalEarnedMicro`
  форматувати через USDC decimals.
- Історія: таблиця (Tournament → лінк `/t/{id}`, Date, Format, Placement, Prize, Game),
  сортування за датою/призом/місцем, пагінація 20/стор. Стилі — як `dashboard/TournamentTable`.
- Якщо це **свій** гаманець (порівняти з `useActiveWallet().address`) — кнопка «Edit / My Account».

**Edge-стани (зі спеки):** «No tournament history…», «No activity found for this address.»

---

## Фаза 3 — My Account `/account` (нове через Privy)

`features/account/AccountPage.tsx` — Privy-gated (`ready && authenticated`, інакше
`<WalletGate/>`/редірект на логін).

**Секції:**

1. **Identity**
   - Аватар (google picture або jazzicon-fallback), display name (google name / email).
   - Linked accounts: список email / google / phone з діями **Link**/**Unlink**:
     `useLinkEmail`, `useLinkWithOAuth`, `useLinkPhone`, `useUnlinkEmail`, `useUnlinkOAuth`.
     Джерело переліку — розширити `lib/privyAuth.ts` (вже єдине джерело методів логіну).

2. **Wallet**
   - Адреса (`useActiveWallet`) + copy + лінк на Explorer (`SOLANA.explorerAddr`).
   - Баланс (reuse `useWalletBalance`).
   - **Fund** — `useFundWallet` з `@privy-io/react-auth/solana` (on-ramp / deposit).
     ⟶ закриває Фазу 4 з `privy-migration.md`.
   - **Export private key** — `useExportWallet` з `@privy-io/react-auth/solana`.
   - ⚠️ Export/Fund показувати **лише для embedded** гаманця (Privy кидає для зовнішніх).
     Визначати тип через `useWallets()` (`walletClientType === "privy"` / `meta`).

3. **Links / actions**
   - «View public profile» → `/player/{myAddress}`.
   - Logout (reuse).

---

## Фаза 4 — Аватар та спільні дрібниці

1. Аватар: додати легкий `react-jazzicon` (детермінований за адресою) АБО власний
   градієнт-identicon, щоб не тягнути залежність. **Рішення:** почати з власного
   `<Identicon address>` (CSS-градієнт за хешем адреси) — нуль залежностей; jazzicon
   опційно пізніше.
2. Винести **`CopyButton`** (`components/ui/CopyButton.tsx`) зі скопійованої логіки
   `ConnectButton` → reuse на профілі/акаунті/сайдбарі. (DRY з нашого аналізу.)
3. `shortenAddress` (вже є в `lib/format.ts`) — використати скрізь.

---

## Файли

| Файл | Фаза | Дія |
|---|---|---|
| `constants/links.ts` | 1 | `ROUTES.player`, `ROUTES.account` |
| `app/player/[wallet]/page.tsx` | 1 | новий wrapper |
| `app/account/page.tsx` | 1 | новий wrapper |
| `components/ConnectButton.tsx` | 1 | пункти меню Account / Profile |
| `features/tournament/view/TournamentSidebar.tsx` | 1 | лінки на профіль |
| `lib/indexerClient.ts` | 2 | тип `IndexerPlayer` (+ майбутній `getPlayer` метод) |
| `lib/mocks/playerProfile.ts` | 2 | новий — детермінований мок |
| `lib/playerSource.ts` | 2 | новий — перемикач мок/ендпоінт за прапорцем |
| `hooks/usePlayerProfile.ts` | 2 | новий |
| `features/player/PlayerProfilePage.tsx` | 2 | новий (+ підкомпоненти Stats/History) |
| `features/account/AccountPage.tsx` | 3 | новий |
| `lib/privyAuth.ts` | 3 | розширити: linkable-акаунти / unlink-мапа |
| `components/ui/CopyButton.tsx` | 4 | новий, reuse |
| `components/ui/Identicon.tsx` | 4 | новий |
| `docs/plans/privy-migration.md` | 3 | позначити Фазу 4 (funding) закритою |

## Порядок і залежності

Фаза 1 (каркас) → Фаза 2 (public, **на моку** — більше не блокована) ∥ Фаза 3 (account) →
Фаза 4 (поліш). Обидві змістовні сторінки тепер будуються одразу, без очікування backend.

Майбутнє: коли індексер віддасть `GET /players/:wallet` — додати `getPlayer` у клієнт,
прибрати прапорець `NEXT_PUBLIC_MOCK_PLAYER_PROFILE`; UI/хуки не змінюються.

## Рішення (узгоджено)

1. ✅ **Дані профілю — мок зараз**, реальний ендпоінт заплановано (розділ «Дані профілю»).
2. ✅ **Без Export** приватного ключа. Обґрунтування: хто свідомо оперує приватним ключем —
   радше скористається зовнішнім гаманцем. Account дає лише **Fund** + перегляд адреси/балансу.
3. ✅ **Власний `<Identicon>`** (CSS-градієнт за хешем адреси), 0 залежностей.
