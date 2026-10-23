# Veya — Dit liv. Ét overblik.

Veya er en life-admin-app til 16–25-årige. Den samler køb, kvitteringer, abonnementer, regninger, returfrister og garantier ét sted og viser kun det, der kræver handling i dag.

**Live:** https://andreasbjoerk.github.io/veyaapp/

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
