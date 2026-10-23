# Veya — Dit liv. Ét overblik.

Veya er en life-admin-app til 16–25-årige. Den samler køb, kvitteringer, abonnementer, regninger, returfrister og garantier ét sted og viser kun det, der kræver handling i dag.

**Live:** https://veyaappester.github.io/veyaapp/

Alle data gemmes kun på din egen enhed (IndexedDB). Der er intet login og ingen server. Åbner du linket på en ny telefon, får du en ny, tom Veya. Tryk "Prøv med demodata" for at se appen fyldt med eksempler.

Projektbeskrivelsen står i [project.md](project.md). [reference/prototype.html](reference/prototype.html) er kun et designudkast.

## Kom i gang (udvikling)

```bash
npm install
npm run dev        # http://localhost:5173/veyaapp/
npm run check      # type-check + lint + unit tests
npm run build      # produktionsbuild i dist/
```

Hvert push til `main` bygger og deployer appen til GitHub Pages via `.github/workflows/deploy.yml`.

## Beslutninger

Korte noter om valg, der ikke står direkte i project.md.

- **Repo-navn og base-sti:** Repoet hedder `veyaapp`, så Vite bruger `base: '/veyaapp/'` (kan overskrives med `VEYA_BASE`). Workflowet sætter den automatisk ud fra repo-navnet.
- **Versioner:** Vite 8, React 19, React Router 7, Dexie 4, Vitest 5. TypeScript er låst til 5.9, fordi typescript-eslint endnu ikke understøtter TypeScript 7.
- **Fonte hostes i appen** (`@fontsource`, kun latin-subset, som dækker æ/ø/å) i stedet for Google Fonts, så appen virker offline og ikke kontakter tredjeparter.
- **Datoer gemmes som lokale `yyyy-MM-dd`-strenge.** Al fristberegning sker på kalenderdage, så tidszoner og sommertid aldrig flytter en frist.
- **Farven `--muted`** er gjort en anelse mørkere (`#6f6480` i stedet for `#7e738d`), så sekundær tekst lever op til WCAG AA-kontrast.
- **Ikoner:** Et lille, håndtegnet SVG-ikonsæt (`src/components/Icon.tsx`) i stedet for emojis og uden ikonbibliotek.
- **Abonnementsbetalinger logges** i en ekstra tabel `subPayments`. Når `nextPayment` er passeret, rulles datoen frem, og betalingen gemmes med den pris, der gjaldt på dagen. Det sker ved hver åbning af appen. Det er den eneste måde at få historisk forbrug rigtigt, når priser ændrer sig. En fornyelse tæller med dagen efter fornyelsesdatoen.
- **Profil har feltet `defaultReturnDays`** (standard returret for butikskøb), som §8.10 nævner, men datamodellen i §6 manglede.
- **Butikkens valg huskes** i tabellen `storePrefs` (returdage, online/butik og kategori pr. butik).
- **Returret-standarder:** Online er altid mindst 14 dage (fortrydelsesret). Kendte butikker bruger deres sædvanlige politik (`src/logic/storeDefaults.ts`, fx Zalando 100 dage og IKEA 365 dage). Dagligvarebutikker har ingen returret. Ukendte fysiske butikker bruger profilens standard (30 dage).
- **Demodata:** AirPods er købt for 28 dage siden med 30 dages returret, så fristen er om 2 dage, som planen ønsker. (Planen sagde både "for 5 dage siden" og "frist om ~2 dage", og det kan ikke begge passe med 30 dage.) Navnet fra onboarding beholdes; standard er "Sofie".
- **Notifikationsregler:**
  - *Udsæt* skjuler en notifikation til i morgen. *Skjul* skjuler kun denne forekomst (nøglen indeholder datoen), så næste frist dukker op igen.
  - Klokkens tal tæller kun "Kræver handling".
  - Reklamationsret-notifikationen ligger under "Veya passer også på", indtil der er 7 dage tilbage.
  - "Alt klar" vises, når ingen regninger forfalder inden for 7 dage.
- **Plan:** Tidslinjen viser 60 dage frem ("Vis mere" udvider). Abonnementsfornyelser vises hver gang de forekommer, med den nye pris efter en varslet prisændring. .ics-eksporten dækker 12 måneder.
- **OCR:** Tesseract.js 7 med dansk + engelsk (`4.0.0_best_int`). Worker, WASM og sprogdata kopieres til `public/ocr` af `scripts/copy-ocr.mjs` (kører før `dev` og `build`, git-ignoreret) og serveres fra appen selv. Filerne caches af service workeren første gang man scanner, så scan virker offline bagefter.
- **"Jeg vil reklamere"** bruger Web Share API (tekst + kvitteringsbillede). Hvor det ikke understøttes (de fleste computere), kopieres teksten, og billedet downloades.
- **PWA:** `vite-plugin-pwa` med auto-opdatering. App-skallen precaches, så appen åbner offline. Ikonerne er genereret ud fra logo-SVG'en (192, 512, maskable og Apple touch).
- **Browser-notifikationer (v1.5):** slås til under Profil. Højst én opsummering om dagen, når appen åbnes. Ægte push i baggrunden kræver en server (fase 2).

## Kendte begrænsninger

- Data synkroniseres ikke mellem enheder (fase 2). Brug "Eksportér mine data" / "Importér backup" for at flytte data.
- OCR-kvaliteten afhænger af billedet. Gennemse-skærmen er derfor obligatorisk.
- Ingen påmindelser, når appen er lukket (kræver push-server).
- Testet automatisk i Chromium (Edge) på mobilbredde og desktop. Skal stadig testes manuelt på en rigtig iPhone (Safari) og Android (Chrome).
