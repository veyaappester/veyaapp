# Veya — Project plan

> **"Dit liv. Ét overblik."**
> A life-admin app for young people (16–25) that gathers purchases, receipts, subscriptions, bills, return deadlines and warranties in one place, and tells the user only what needs action today.

This file is the brief for building Veya as a **real, working web app** that can be opened from a shareable link on any phone or computer.

**About the existing HTML file (`reference/prototype.html`):** it is a **design mockup only**: start screen, look and feel, colours and a few example screens. It is **not** the final app and its code should **not** be reused. Use it as visual inspiration; build the real app from this plan.

---

## 1. Background (from the idea document)

**Team:** Ainoa, Anna and Ester (EØ project).

**Problem:** Young people's financial and practical information is spread across online banking, email, the camera roll and many subscriptions. They forget return deadlines, can't find the receipt when making a complaint, and keep paying for subscriptions they don't use. The problem is not just a lack of overview, but that the information rarely turns into a concrete action at the right time.

**Solution:** The user scans a receipt. Veya saves store, product, price and purchase date and connects the purchase to the budget, the return deadline and the warranty/complaint period. Veya also collects subscriptions and upcoming payments. The **"Veya i dag"** page shows only the things that need attention (e.g. a return deadline in two days, or a subscription price increase).

**What makes Veya different:**
1. It follows a purchase all the way: purchase → documentation → return → warranty → next action.
2. Receipts, subscriptions and warranties live in one app.
3. Receipts can be shown in the store directly from the app ("Vis i butik"), so the user doesn't need to carry paper receipts.

**Target group:** 16–25 year olds with their first independent finances (student job, SU, online shopping, subscriptions). Digital natives who want simplicity.

---

## 2. Goals for this build

1. **Functional, not a mock.** Everything the user enters is saved and drives the rest of the app (budget, plan, "Veya i dag", notices). No hardcoded people, dates or amounts outside demo data.
2. **Shareable link.** Hosted online for free; anyone can open it on their phone and "Add to Home Screen" so it feels like an app (PWA).
3. **Private by default.** Each visitor's data is stored on their own device (no login needed in v1). Opening the link on a new phone = a fresh, empty Veya.
4. **Presentation-ready.** A "Load demo data" button fills the app with realistic example data relative to today's date, so the group can demo it any day.
5. **Danish UI.** All user-facing text in Danish. Code, comments and this plan in English.

---

## 3. Tech stack (chosen for simplicity + free hosting)

| Area | Choice | Why |
|---|---|---|
| Framework | **Vite + React + TypeScript** | Fast, standard, static output that hosts anywhere |
| Routing | **React Router** (`HashRouter`) | Works on any static host incl. GitHub Pages, no server config |
| Storage | **IndexedDB via Dexie.js** | Stores records *and* receipt images on the device; survives reloads |
| Receipt OCR | **Tesseract.js** (Danish + English language data), runs in the browser | Free, no API key, no backend |
| Dates | **date-fns** with `da` locale | Deadline maths and Danish date formatting |
| Charts | Plain CSS/SVG (as in the prototype) | No heavy chart library needed |
| PWA | **vite-plugin-pwa** | Installable, offline-capable, app icon |
| Styling | Plain CSS with design tokens (CSS variables) | Matches prototype; no framework lock-in |
| Hosting | **GitHub Pages** (public repo, auto-deploy via GitHub Actions) | Free link like `https://<username>.github.io/veya/`; see §11 |

No backend in v1. Optional backend features are listed in §12 (Phase 2).

---

## 4. Design system

Take the visual language (not the code) from the design mockup `reference/prototype.html`. **Note:** the mockup contains several stacked, conflicting theme overrides (green, blue and purple). The one that actually wins in the browser is the **purple** theme with the two-leaf logo. Consolidate into ONE clean token set:

```css
:root {
  --primary: #825fc1;   /* buttons, active nav, links */
  --deep:    #3d1a70;   /* dark text on tinted buttons */
  --mint:    #f0eaff;   /* tinted surfaces, icon backgrounds */
  --pale:    #faf8fd;   /* cards, inputs, tab background */
  --ink:     #221632;   /* main text */
  --muted:   #7e738d;   /* secondary text */
  --line:    #eee8f4;   /* dividers */
  --warn:    #e68a3f;   /* deadlines, warnings */
  --danger:  #d75c5c;   /* overdue */
  --ok:      #2e9e6a;   /* paid / handled */
  --white:   #ffffff;
}
```

- **Fonts:** Poppins (h1/h2), Inter (buttons, nav, tabs), DM Sans (body). Load from Google Fonts.
- **Logo:** the two-leaf mark (dark purple leaf + light purple leaf on a soft lavender rounded square). Rebuild as an SVG component and also export it as PWA icons (192, 512, maskable).
- **Layout:** mobile-first. On screens wider than 430px, show the app inside a centred phone-shaped frame (390px wide, rounded corners, shadow) as in the prototype. On phones, full screen.
- **Components to reuse from prototype:** `.notice` cards, `.row` list items with icon square, `.info` grouped card, `.hero` budget card with progress bar, `.tabs` segmented control, `.action` / `.action.secondary` buttons, `.timeline` with dots, bottom nav with raised centre Scan button, toast, modal.
- Replace emoji product icons with category icons (simple SVG set) for a cleaner look; emojis acceptable as fallback.
- Respect safe areas on iPhone (`env(safe-area-inset-bottom)` under the nav).

---

## 5. Information architecture

Bottom nav (5 items): **Overblik · Køb · [Scan] · Abonn. · Plan**

Other screens reached from inside the app: Veya i dag, Købsdetalje, Kvittering / Vis i butik, Scan-resultat, Økonomi, Regninger, Profil & indstillinger, Onboarding.

```
/                      Overblik (home)
/i-dag                 Veya i dag (action feed)
/koeb                  Mine køb (list)
/koeb/:id              Købsdetalje
/koeb/:id/kvittering   Kvittering fullscreen ("Vis i butik")
/koeb/ny               Manual add purchase
/scan                  Scan step 1 (camera / choose photo)
/scan/resultat         Scan step 2 (review extracted data)
/abonnementer          Abonnementer
/abonnementer/:id      Abonnement detail/edit
/regninger             Regninger (bills)
/plan                  Plan (Tidslinje | Kalender)
/oekonomi              Økonomi
/profil                Profil & indstillinger
/velkommen             Onboarding (first run only)
```

---

## 6. Data model (Dexie / IndexedDB)

```ts
type Category = 'elektronik' | 'toej' | 'mad' | 'skoenhed' | 'bolig' | 'transport' | 'fritid' | 'andet';

interface Profile {
  id: 'me';
  name: string;
  monthlyBudget: number;          // kr.
  noticeDaysBefore: number;       // default 3 — how early deadlines become notices
  createdAt: string;
}

interface Purchase {
  id: string;
  product: string;
  store: string;
  storeLocation?: string;
  price: number;                  // kr., total
  date: string;                   // ISO date of purchase
  category: Category;
  boughtOnline: boolean;
  returnDays: number | null;      // null = no return right
  returnDeadline: string | null;  // computed: date + returnDays
  complaintYears: number;         // reklamationsret, default 2
  complaintUntil: string;         // computed
  extraWarrantyUntil?: string;    // optional manufacturer/extra warranty
  receiptImageId?: string;        // -> ReceiptImage
  receiptText?: string;           // raw OCR text (searchable)
  receiptNumber?: string;         // kassebon nr. if found
  paymentMethod?: string;         // e.g. "Visa •••• 4251"
  status: 'active' | 'returned' | 'kept' | 'complaint';
  note?: string;
  createdAt: string;
}

interface ReceiptImage { id: string; blob: Blob; thumb: Blob; }  // compressed to ~1200px JPEG

interface Subscription {
  id: string;
  name: string;
  plan?: string;                  // "Premium Student"
  price: number;                  // current price per cycle
  cycle: 'monthly' | 'yearly' | 'weekly';
  nextPayment: string;            // ISO date
  category: Category;
  priceHistory: { price: number; from: string }[];  // drives price-change notices
  upcomingPrice?: { price: number; from: string };  // user-entered announced increase
  lastUsedCheck?: string;         // for "Bruger du den stadig?" prompts
  active: boolean;
}

interface Bill {
  id: string;
  name: string;                   // "Husleje", "El", "Telmore"
  amount: number;
  dueDate: string;
  recurring: 'none' | 'monthly' | 'quarterly' | 'yearly';
  paid: boolean;
  paidAt?: string;
}

interface Expense {               // quick spends without receipt (café etc.) — optional
  id: string; label: string; amount: number; date: string; category: Category;
}

interface PlanEvent {             // user's own events (e.g. "Studiegruppe")
  id: string; title: string; date: string; time?: string; place?: string;
}

interface DismissedNotice { key: string; until: string; }  // snooze/dismiss
```

All derived things (deadlines, totals, notices, timeline) are **computed from these tables**, never stored separately. Use Dexie `liveQuery` / `useLiveQuery` so every screen updates instantly when data changes.

---

## 7. Core logic

### 7.1 Danish consumer-rights defaults (user can always edit)
- **Online purchase:** `returnDays = 14` (fortrydelsesret).
- **In-store purchase:** no legal return right; many stores offer one voluntarily. Default `returnDays = 30` with the label "Butikkens returret — tjek butikkens regler", editable, and a "Ingen returret" option.
- **Garanti / reklamationsret:** default 2 years from purchase date (editable). Label it "Garanti (2 år)" as in the design; any extra warranty can be added separately.
- Keep a small editable lookup `storeDefaults` (store name → return days, online yes/no) seeded with common Danish stores; the user's last choice for a store is remembered.

### 7.2 Notice engine (powers "Veya i dag", home notices and the bell badge)
A pure function `buildNotices(data, today) → Notice[]`, each with `key`, `priority`, `icon`, `title`, `subtitle`, `actionLabel`, `link`. Rules:

| Rule | Trigger | Example text |
|---|---|---|
| Return deadline | `status='active'` and deadline within `noticeDaysBefore` (or overdue today) | "Din returfrist udløber om 2 dage" · "AirPods Pro 2 · Elgiganten" |
| Complaint period ending | `complaintUntil` within 30 days | "Reklamationsretten på Nintendo Switch udløber snart" |
| Subscription renewal | `nextPayment` within 2 days | "Netflix fornyes i morgen · 149 kr." |
| Price increase | `upcomingPrice` set or latest `priceHistory` > previous | "Netflix stiger 10 kr. fra 1. november" |
| Unused subscription check | every 60 days per subscription | "Bruger du stadig Viaplay?" (Ja / Opsig) |
| Bill due | unpaid, due within `noticeDaysBefore` | "Husleje forfalder fredag · 4.200 kr." |
| Bill overdue | unpaid, past due | red notice |
| Budget warning | spent > 80% of budget before day 20 of the month | "Du har brugt 82% af dit budget" |
| All clear | no unpaid bills | "Du har ingen ubetalte regninger" (green, low priority) |

Sort by urgency (overdue → days left → amount). Every notice can be **dismissed** or **snoozed** (stored in `DismissedNotice`). Home shows the top 3; "Veya i dag" shows all, grouped "Kræver handling" / "Veya passer også på".

### 7.3 Recurring dates
When a subscription's `nextPayment` passes, roll it forward by its cycle automatically on app open (and log the spend into the month's totals). Same for recurring bills (create next instance when one is marked paid).

### 7.4 Budget maths
`spentThisMonth = purchases + expenses + subscription payments + paid bills` dated in the current month. Show used %, remaining kr., month-by-month bars for the last 6 months, and a category breakdown (donut).

---

## 8. Screens & features (acceptance criteria)

### 8.1 Onboarding (first run)
- 3 short slides explaining Veya (overblik, scan, Veya i dag) → name → monthly budget (with suggestion, e.g. 9.600 kr.) → "Prøv med demodata" or "Start tomt".
- Afterwards never shown again (unless data is reset).

### 8.2 Overblik (home)
- "Godmorgen/Goddag/Godaften, {name}" based on time of day; date subtitle.
- **"Veya i dag" card**: "N ting kræver din opmærksomhed" → `/i-dag`.
- **"Det vigtigste lige nu"**: top 3 notices, tappable to the relevant screen.
- **Budget card**: spent / budget, progress bar, remaining, % used → `/oekonomi`.
- **Abonnementer summary**: monthly total, count, next renewal → `/abonnementer`.
- **Seneste køb**: last 3 purchases → detail.
- Bell icon in the top bar with badge count → `/i-dag`; avatar → `/profil`.

### 8.3 Veya i dag
- Full list from the notice engine with clear action buttons ("Se muligheder for købet", "Se abonnement", "Markér som betalt", "Udsæt", "Skjul").
- Empty state: "Alt er under kontrol 🎉 Veya siger til, når der sker noget."

### 8.4 Scan (the hero feature)
1. Step 1: live camera view inside the corner frame where supported (`getUserMedia`, rear camera) with a capture button, plus "Vælg fra billeder" (file input with `accept="image/*" capture="environment"` fallback — this is what works most reliably on iPhone).
2. Show progress "Veya læser din kvittering…" while Tesseract runs (load language data lazily, only on this screen).
3. **Parser** (`parseReceipt(text)`): find store (first lines / known store list), date (dd-mm-yyyy, dd.mm.yy, etc.), total (lines with TOTAL/I ALT/AT BETALE, largest amount fallback), product lines, receipt number (Kassebon/Bon nr.), card ending (•••• 1234). Unit-test it with sample Danish receipt texts.
4. Step 2 "Køb fundet": editable form pre-filled with the parsed values (product, store, date, price, category, online/in-store, return days). Missing fields highlighted. Show the photo thumbnail.
5. "Gem køb og opdater overblik" → saves purchase + compressed image, toast "Købet er gemt — økonomi og plan er opdateret.", navigates home.
- Also: "Tilføj manuelt" without a photo.
- OCR quality will vary — the review step is mandatory so the user can fix mistakes.

### 8.5 Mine køb + Købsdetalje
- List with search (product, store, OCR text) and category filter tabs (Alle + categories in use). Each row shows price and a status hint ("↩ 2 dage", "Reklamationsret gemt", "Returneret").
- Detail: hero with category icon, product, store, purchase date, price, return deadline (orange when close, countdown), reklamationsret until, extra warranty, payment method, note.
- Buttons:
  - **"Se kvittering"** → full receipt image (pinch-zoom).
  - **"Vis i butik"** → fullscreen high-contrast view of the receipt image + key info (store, date, kassebon nr., total), screen kept awake where supported (Wake Lock API). This is the "no paper receipt" differentiator.
  - **"Jeg vil reklamere"** → generates a complaint package: a pre-written Danish complaint text (product, purchase date, price, receipt no.) + the receipt image, shared via the Web Share API (fallback: copy text + download image). Sets status to `complaint`.
  - **"Jeg har returneret den"** / **"Jeg beholder den"** → updates status, removes return notices; returned purchases are excluded from spending.
  - Edit / delete.

### 8.6 Abonnementer
- Monthly total (yearly subs converted to monthly) and count.
- "Kommende betalinger" sorted by next payment.
- Add/edit form (name, plan, price, cycle, next payment date, category). Quick-add chips for common Danish services (Netflix, Spotify, Viaplay, HBO Max, Disney+, TV 2 Play, YouSee, Telmore, fitness, iCloud) — user still enters price.
- "Prisændring": enter a new price + start date → creates price-change notice and shows "+10 kr." badge.
- "Opsig" → marks inactive and shows a reminder to also cancel with the provider (Veya can't cancel for them).
- Insight line: "Du bruger X kr. om året på abonnementer."

### 8.7 Regninger
- List of bills (unpaid first), add/edit, "Markér som betalt", recurring bills auto-create the next one. Reachable from home and Plan.

### 8.8 Plan
- Segmented control **Tidslinje | Kalender** (working, as in the latest prototype).
- **Tidslinje:** grouped by month; all upcoming return deadlines, complaint-period endings, subscription renewals, bills, and the user's own events, with warning colour for things within `noticeDaysBefore`.
- **Kalender:** month grid with dots on days that have events; today highlighted; tap a day to list its items; swipe/arrows between months.
- "+ Tilføj begivenhed" for own events (title, date, time, place).
- "Veya holder også styr på" cards: next warranty/complaint expiry, next bill.
- Optional: "Eksportér til kalender" (.ics download of all deadlines).

### 8.9 Økonomi
- Budget card (remaining, spent, budget), 6-month bar chart (current month highlighted), category donut + legend with amounts, top 3 categories this month. All computed live.
- "Tilføj udgift" quick-add for small spends without a receipt.

### 8.10 Profil & indstillinger
- Name, avatar initial, monthly budget, notice days before (1/3/7), default return days.
- **Data:** "Eksportér mine data" (JSON backup incl. images as base64), "Importér backup", "Indlæs demodata", "Slet alle data" (with confirmation).
- "Installér Veya på din telefon" instructions (iOS: Del → Føj til hjemmeskærm; Android: install prompt).
- Short privacy line: "Dine data gemmes kun på denne enhed."
- Slogan footer "Dit liv. Ét overblik."

### 8.11 Notifications
- v1: in-app notices + badge on the bell; check on every app open.
- Optional v1.5: browser notifications via the Notification API when the app is opened (permission asked from Profil, not on first launch). True background push requires a server and is Phase 2.

---

## 9. Demo data

`seedDemoData(today)` creates realistic data **relative to today** so the demo always looks current. Based on the prototype:

- Profile: name "Sofie", budget 9.600 kr.
- Purchases: AirPods Pro 2 (Elgiganten, 1.899 kr., bought today−5, in-store, 30-day return → deadline in ~2 days for the demo, sample receipt image), New Balance 530 (Zalando, 899 kr., online), Niacinamide serum (Matas, 119 kr.), Føtex groceries (463 kr.), Nintendo Switch (bought ~22 months ago so reklamationsret ends soon), Joe & The Juice expense (78 kr., today).
- Subscriptions (6, ~597 kr./month total): Netflix 149 kr. renewing tomorrow with announced increase to 159 kr. next month, Spotify Premium Student 69 kr., Telmore 129 kr., plus three more (e.g. iCloud, fitness, Viaplay) to reach the total.
- Bills: one paid, one upcoming.
- Plan events: Studiegruppe 15.00, CBS Bibliotek.
- Previous 5 months of spending so the bar chart has history.
- Include a bundled sample receipt image (`public/demo/receipt-elgiganten.jpg`, generated, clearly fictional).

---

## 10. Project structure & milestones for Claude Code

```
veya/
  project.md
  reference/prototype.html        # visual reference only
  public/ (icons, demo receipt, manifest assets)
  src/
    main.tsx, App.tsx, routes.tsx
    styles/tokens.css, base.css, components.css
    db/ (schema.ts, demo.ts, backup.ts)
    logic/ (notices.ts, deadlines.ts, budget.ts, recurring.ts, receiptParser.ts, storeDefaults.ts)
    ocr/ (tesseract.ts)
    components/ (Nav, Notice, Row, Card, Tabs, Button, Toast, Modal, Logo, ProgressBar, Donut, BarChart, CalendarGrid, Timeline, EmptyState, PhoneFrame)
    screens/ (Home, Today, Purchases, PurchaseDetail, ReceiptView, Scan, ScanResult, Subscriptions, Bills, Plan, Finance, Profile, Onboarding)
  tests/ (receiptParser.test.ts, notices.test.ts, budget.test.ts)
```

Build in this order. Finish and verify each milestone before the next; commit after each.

1. **Setup & shell** — Vite + React + TS (set `base: '/veya/'` in `vite.config.ts` for GitHub Pages), tokens/fonts, phone frame, bottom nav, routing to placeholder screens, logo SVG. *Done when:* all nav tabs switch screens, looks like the design mockup.
2. **Data layer** — Dexie schema, demo seed, onboarding, profile. *Done when:* onboarding saves name/budget, demo data loads, reload keeps data.
3. **Purchases** — list, search, filters, detail, manual add/edit/delete, deadline logic, status buttons. *Done when:* adding a purchase shows correct return deadline and reklamationsret date.
4. **Subscriptions & bills** — CRUD, monthly totals, recurring roll-forward, price change.
5. **Notice engine + Overblik + Veya i dag** — with unit tests. *Done when:* demo data produces the AirPods and Netflix notices; dismiss/snooze works.
6. **Plan** — timeline + calendar views from real data, own events, .ics export.
7. **Økonomi** — budget card, bar chart, donut from real data.
8. **Scan** — camera/photo, Tesseract OCR, parser + tests, review screen, image storage. *Done when:* a photo of a real Danish receipt ends up as a saved purchase after review.
9. **Receipt features** — Se kvittering, Vis i butik (wake lock), Jeg vil reklamere (Web Share).
10. **PWA & polish** — manifest, icons, offline, install instructions, empty states, Danish copy review, accessibility (labels, contrast, tap targets ≥ 44px), test on iPhone Safari and Android Chrome.
11. **Deploy** — push to a public GitHub repo, deploy with GitHub Pages via GitHub Actions (see below), verify the live link on a phone. (Deploying early, right after milestone 1, is also fine so the group can follow progress on the live link.)

---

## 11. Hosting — getting a shareable link

**Chosen: GitHub Pages, public repository (free).**

1. One group member creates a free GitHub account (or uses an existing one).
2. Create a **public** repository named `veya` on github.com (empty, no README), or let Claude Code do it with `gh repo create veya --public --source=. --push`.
3. Claude Code adds the workflow file `.github/workflows/deploy.yml` that on every push to `main`: installs dependencies, runs `npm run build`, and publishes `dist/` using the official `actions/upload-pages-artifact` + `actions/deploy-pages` actions.
4. On github.com → repo → **Settings → Pages → Source: "GitHub Actions"**.
5. After the first push the app is live at `https://<username>.github.io/veya/`. Every later push updates it automatically (takes ~1 minute).

Technical requirements for GitHub Pages (Claude Code must handle these):
- `base: '/veya/'` in `vite.config.ts` (must match the repo name).
- `HashRouter` so deep links and page reloads work (URLs look like `.../veya/#/koeb`).
- PWA manifest `start_url` and `scope` set to `/veya/`; service worker registered with the same scope.
- Asset paths always relative to `base` (no hardcoded `/` paths).

**Public repo = public code, private data.** Anyone can see the source code, but no user data is in the repo: every person's purchases and receipts are stored only on their own device. Never commit API keys or real personal receipts.

**Other members:** add Anna and Ester as collaborators (Settings → Collaborators) so they can push too.

**Sharing:** send the link or show a QR code in the presentation. Each person gets their own empty, private Veya; tap "Indlæs demodata" to explore.

---

## 12. Phase 2 (optional, after v1 works)

- **Accounts & sync across devices:** Supabase (free tier) — auth (email magic link), Postgres tables mirroring §6, Storage bucket for receipt images, row-level security so users only see their own data.
- **Better receipt reading:** a serverless function (e.g. Supabase Edge Functions — GitHub Pages can only host static files, not server code) that sends the image to a vision-capable AI model and returns structured JSON (store, items, total, date). API key stays server-side only — never in the frontend.
- **Real push notifications:** Web Push with a scheduled server job (iOS requires the app to be installed to the home screen).
- **Bank connection** (open banking aggregators) to auto-detect subscriptions and purchases — requires a company agreement and compliance work; out of scope for the school project, but worth mentioning in the business case.
- **E-receipt import** from email (forwarding address) and digital receipts from store loyalty apps.

---

## 13. Non-functional requirements

- Works offline after first load; fast first load (< 2 s on 4G excluding OCR data, which loads only on Scan).
- Images compressed client-side (max ~1200px, JPEG ~0.7) to keep storage small.
- No external tracking or analytics. No data leaves the device in v1.
- All amounts formatted Danish style: `1.899 kr.`; dates `9. sep. 2026` / `fredag 12. september`.
- Accessible: semantic buttons/links, aria-labels on icon buttons, visible focus, sufficient contrast.
- Lint + type-check clean; unit tests for parser, notices, deadlines and budget pass.

---

## 14. How to use this file with Claude Code

1. Make a folder `veya/`, put this `project.md` in it, and save the design mockup as `reference/prototype.html`.
2. Open a terminal in the folder and start Claude Code.
3. Prompt: *"Read project.md and look at reference/prototype.html for the design only. Build milestone 1, set up GitHub Pages deployment to a public repo, then stop and give me the live link."* Continue milestone by milestone ("Build milestone 2", …).
4. Each finished milestone: *"Commit and push"* → the live link updates automatically.
