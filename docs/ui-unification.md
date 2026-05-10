# Уніфікація UI елементів — аналіз та план

## Висновок: так, можливо

Проєкт має готову компонентну бібліотеку (`components/ui/`) з 7 компонентів, жоден з яких не використовується. Натомість — 14 файлів зі 100% inline-стилями, 500+ дублювань кольорів як рядків, 19+ незалежних реалізацій кнопок. Уніфікація можлива без втрати функціональності чи різноманітності — усі наявні візуальні варіанти вписуються в 4–5 семантичних variant.

---

## Поточний стан (аудит)

| Метрика | Значення |
|---|---|
| Файли з 100% inline-стилями | 14 з 24 |
| Доступні ui/ компоненти, що не використовуються | 7 (Button, Badge, Select, Checkbox, Switch, Tabs, Form*) |
| Унікальних реалізацій кнопок | 19+ |
| Дублювань кольорів як inline-рядків | 500+ |
| Дублювань структури модального вікна | 3 |
| Дублювань badge/pill стилів | 40+ |
| Ліній дублюючого стайлінг-коду | ~3 000 |

### Що дублюється найбільше

**Кнопки (5 патернів, кожен ×10–20 файлів):**

```ts
// A — зелена primary з glow (15+ копій)
{ background: "#22d47e", color: "#06070b", boxShadow: "0 0 18px rgba(34,212,126,0.28)" }
// + onMouseEnter/Leave для hover через style mutation

// B — outline нейтральна (20+ копій)
{ border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(240,241,245,0.55)" }

// C — amber попередження (8+ копій)
{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.3)", color: "#f5a623" }

// D — red destructive (10+ копій)
{ background: "rgba(240,78,102,0.08)", border: "1px solid rgba(240,78,102,0.25)", color: "#f04e66" }

// E — disabled (15+ копій)
{ background: "rgba(255,255,255,0.06)", color: "rgba(240,241,245,0.25)", cursor: "not-allowed" }
```

**Hover через DOM mutation (100+ разів):**
```ts
onMouseEnter={e => { e.currentTarget.style.background = "#16c062"; }}
onMouseLeave={e => { e.currentTarget.style.background = "#22d47e"; }}
```

**Modal overlay (3 ідентичні копії):**
```ts
{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }
```

**Badge/pill (40+ копій):**
```ts
{ fontFamily: "'DM Mono', monospace", fontSize: "0.65rem", padding: "3px 10px", borderRadius: 999 }
```

---

## Що не треба чіпати

Не весь inline-стайлінг є проблемою. Деякі речі краще залишити як є:

- **Унікальні layout-стилі** — grid, flex у складних компонентах (TournamentHeader info strip, BracketView)
- **Динамічні значення** — ширина прогрес-бару (`width: ${pct}%`), позиції SVG/canvas
- **Одноразові декоративні стилі** — специфічний glow на Hero, gradient на логотипі
- **Контекстний стан** — `background: isYou ? "rgba(34,212,126,0.06)" : "rgba(255,255,255,0.03)"` в рядах списку

---

## Варіанти, що покривають усі наявні кнопки

Поточна `Button` (`components/ui/button.tsx`) не має правильних варіантів для темної теми проєкту. Потрібно розширити:

| variant | Призначення | Де зараз |
|---|---|---|
| `primary` | Основна дія: Join, Start, Create, Connect | `btnGreen` inline об'єкт |
| `outline` | Вторинна дія: Cancel, Share, Back | нейтральний inline об'єкт |
| `destructive` | Небезпечна дія: Cancel Tournament | `CancelDangerZone` inline |
| `warning` | Попередження: Start Early, Continue Init | amber inline об'єкт |
| `ghost` | Текстова: Back (без рамки), Payout expander | вже є у button.tsx але не використовується |

**Розміри:**

| size | Застосування |
|---|---|
| `lg` | Основні CTA (Join, Create) — `padding: "12px 0"`, `width: 100%` |
| `default` | Стандартні (Share, Next, Confirm) — `padding: "9px 20px"` |
| `sm` | Компактні (Manage у таблиці, badge-like) |
| `icon` | Іконка-кнопка (X в модалці, refresh) |

**Висновок:** 5 variants × 4 sizes = 20 комбінацій покривають усі 19+ наявних реалізацій.

---

## Варіанти для інших компонентів

### Input

Наявний `components/ui/input.tsx` + helper `inputCls()` в steps — вже покривають базові потреби. Не вистачає:
- Темного фону (наразі defaultний Tailwind bg)
- Стилю для native `<select>` (FilterBar робить свій)
- Number input з prefix/suffix (для USDC/SOL deposit)

### Badge / StatusBadge

`components/ui/badge.tsx` існує але не використовується. Потрібно додати variant-и під темну тему або створити `StatusBadge` з правильними кольорами для `registration | in_progress | completed | cancelled | registration_closed`.

### Modal

Немає жодного обгорткового компонента. 3 ідентичні overlay структури. Потрібен один `<Modal>` компонент.

### Switch / Toggle

`components/ui/switch.tsx` існує. Два кастомних toggles в `DetailsStep` і `FilterBar` — обидва можна замінити без жодної втрати функціональності.

---

## Що зберігається (різноманітність не втрачається)

Питання "без втрати різноманітності" — ключове. Ось як variants відображаються на поточний UI:

```
[Connect to Join]     → Button variant="primary" size="lg" fullWidth
[Join Tournament]     → Button variant="primary" size="lg" fullWidth
[Start Tournament]    → Button variant="primary" size="lg" fullWidth
[Registered ✓]        → Button variant="primary" size="lg" disabled fullWidth
─────────────────────────────────────────────────────────────────────
[Share]               → Button variant="outline" size="default"
[Keep Tournament]     → Button variant="outline" size="default" fullWidth
[Cancel]              → Button variant="outline" size="default" fullWidth
[Back]                → Button variant="ghost" size="default"
─────────────────────────────────────────────────────────────────────
[Cancel Tournament]   → Button variant="destructive" size="default" fullWidth
─────────────────────────────────────────────────────────────────────
[Start Early]         → Button variant="warning" size="lg" fullWidth
[Continue Init]       → Button variant="warning" size="default" fullWidth
─────────────────────────────────────────────────────────────────────
[X] [Refresh]         → Button variant="ghost" size="icon"
```

Вся наявна різноманітність (зелений primary, нейтральний outline, червоний danger, amber warning) зберігається через variant — просто декларативно, без дублювання стилів.

---

## Підхід до міграції (без breaking changes)

### Фаза 1 — Кольорові токени (незалежна, 0 ризику)

Додати CSS змінні в `app/globals.css`:
```css
:root {
  --color-primary: 34 212 126;        /* #22d47e */
  --color-primary-dark: 22 192 98;    /* #16c062 (hover) */
  --color-destructive: 240 78 102;    /* #f04e66 */
  --color-warning: 245 166 35;        /* #f5a623 */
  --color-surface: 13 15 24;          /* #0d0f18 */
  --color-border: 255 255 255;        /* white at opacity */
  --color-text: 240 241 245;          /* #f0f1f5 */
}
```

І в `tailwind.config`:
```js
colors: {
  primary: "rgb(var(--color-primary) / <alpha-value>)",
  destructive: "rgb(var(--color-destructive) / <alpha-value>)",
  warning: "rgb(var(--color-warning) / <alpha-value>)",
  surface: "rgb(var(--color-surface) / <alpha-value>)",
}
```

### Фаза 2 — Оновити Button компонент

Замінити `cva` варіанти в `components/ui/button.tsx` під темну тему:

```ts
variants: {
  variant: {
    primary:     "bg-primary text-[#06070b] hover:bg-primary-dark shadow-[0_0_18px_rgb(var(--color-primary)/0.28)] hover:shadow-[0_0_28px_rgb(var(--color-primary)/0.48)]",
    outline:     "border border-white/[0.12] bg-transparent text-white/55 hover:border-white/[0.22] hover:text-white",
    destructive: "bg-destructive/10 border border-destructive/25 text-destructive hover:bg-destructive/20",
    warning:     "bg-warning/10 border border-warning/30 text-warning hover:bg-warning/20",
    ghost:       "bg-transparent hover:bg-white/5 text-white/40 hover:text-white/70",
  },
  size: {
    lg:      "w-full h-12 px-0 rounded-[10px] font-bold text-sm",
    default: "h-9 px-5 rounded-[8px] font-semibold text-sm",
    sm:      "h-7 px-3 rounded-[6px] font-medium text-xs",
    icon:    "size-8 rounded-[8px]",
  }
}
```

### Фаза 3 — Покомпонентна міграція (по одному файлу)

Пріоритет по кількості дублювань:

1. `TournamentSidebar.tsx` — найбільше кнопок (Join, Connect, Start, Cancel, Registered)
2. `TournamentHeader.tsx` — Share, Tweet
3. `CreateTournament.tsx` + steps — Next, Back, Confirm
4. `CancelModal.tsx`, `ReportResultModal.tsx` — модальні кнопки
5. `FilterBar.tsx` — Select → ui/select, Switch → ui/switch
6. `ConnectButton.tsx` — повний рефакторинг
7. `DashboardPage.tsx`, `TournamentTable.tsx` — Manage, Create

### Фаза 4 — Modal компонент

```tsx
// components/ui/modal.tsx
export function Modal({ open, onClose, children, maxWidth = 400 }) {
  if (!open) return null;
  return (
    <div style={{ /* overlay */ }} onClick={onClose}>
      <div style={{ /* panel */ }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}
Modal.Header = function ModalHeader({ title, onClose, disabled }) { ... }
Modal.Body    = function ModalBody({ children }) { ... }
Modal.Actions = function ModalActions({ children }) { ... }
```

---

## Ризики та обмеження

| Ризик | Рівень | Митигація |
|---|---|---|
| Розбіжність у пікселях при міграції | Низький | Tailwind config ≡ inline значення |
| Зламаний hover через CSS transition vs DOM mutation | Низький | `transition-all` в cva base |
| Втрата `width: 100%` на lg кнопках | Низький | `w-full` prop або asChild |
| Конфлікт dark/light mode (richColors у Sonner) | Ніякий | Проєкт dark-only |
| Перерва в роботі при великій міграції | Середній | Файл за файлом, не all-at-once |

---

## Очікуваний результат

| До | Після |
|---|---|
| ~3 000 рядків дублюючих стилів | ~300 рядків у button.tsx + токени |
| 500+ inline кольорових рядків | CSS змінні + Tailwind |
| 100+ `onMouseEnter/Leave` хендлерів | `hover:` Tailwind класи |
| 3 ідентичні modal overlay | 1 `<Modal>` компонент |
| 0% використання ui/ бібліотеки | 100% |
| Непередбачувані відступи між файлами | Єдині size variants |
