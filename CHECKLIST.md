# Veya: funktionstjek

**Instruks til Claude Code:** Gå punkterne igennem ét ad gangen. Tjek i koden OG i den kørende app (start den, klik igennem, brug Edge/Chrome med mobilvisning). Marker hvert punkt med `[x]` hvis det virker, eller `[ ]` hvis det mangler eller er fejlbehæftet, og skriv en kort note ved fejl. Ret alt, der mangler eller er galt, kør tests, lint og type-check, commit og push. Afslut med en samlet liste: hvad virker, hvad blev rettet, hvad kan kun testes på en rigtig telefon.

**Gennemgået 23-10-2026** i koden og med et automatisk audit-script (Edge, mobilvisning 375 og 390 px) mod den lokale app og live-linket https://veyaappester.github.io/veyaapp/. "Rettet" = fejl fundet og rettet i samme commit som denne fil.

---

## 1. Grundlag og hosting
- [x] Appen bygger uden fejl (`npm run build`)
- [x] Type-check, lint og alle tests består (55 tests; 2 sprunget over: rigtig bon mangler, og settings-sammenligningen kører kun på opfordring)
- [x] `base`-sti i `vite.config.ts` matcher repo-navnet (`/veyaapp/`)
- [x] HashRouter bruges, og genindlæsning på en under-side virker (testet på `#/koeb`)
- [x] GitHub Actions-workflow deployer til Pages ved push til `main`
- [x] Live-linket åbner appen uden fejl i konsollen (0 fejl, 0 advarsler)
- [x] Ingen requests til tredjeparter (fonte og OCR-data hostes i appen; 0 fremmede værter målt)
- [x] README.md beskriver beslutninger og hvordan man kører appen

## 2. Design og layout
- [x] Kun ét farvetema (lilla), samlet i CSS-variabler (`src/styles/tokens.css`)
- [x] Logoet (to blade) vises i toppen og som app-ikon
- [x] Skrifttyper: Poppins (overskrifter), Inter (knapper/menu), DM Sans (brødtekst)
- [x] På desktop vises appen i telefon-ramme (390 px); på mobil i fuld skærm
- [x] Bundmenu med 5 punkter: Overblik, Køb, Scan (hævet midterknap), Abonn., Plan
- [x] Aktiv fane er markeret
- [x] Tryk-områder er mindst 44 px; sikre områder på iPhone respekteres. **Rettet:** fanerne var 40 px høje, "Tøj"-fanen 41 px bred, og kalenderdagene lidt under 44 px. Nu er alle ≥ 44 px, også på en 375 px skærm uden vandret scroll.
- [x] Tomme tilstande findes på alle lister (køb, abonnementer, regninger, plan, Veya i dag, økonomi)

## 3. Onboarding
- [x] Vises kun første gang
- [x] 3 slides (overblik, scan, Veya i dag)
- [x] Navn og månedligt budget kan indtastes (med forslag)
- [x] Valg: "Prøv med demodata" eller "Start tomt"
- [x] Data overlever genindlæsning

## 4. Overblik (forside)
- [x] Hilsen efter tidspunkt (Godmorgen/Goddag/Godaften) med brugerens navn
- [x] "Veya i dag"-kort med antal ting, der kræver opmærksomhed
- [x] "Det vigtigste lige nu": op til 3 notifikationer, klikbare
- [x] Budgetkort med forbrug, procent, resterende beløb og statuslinje
- [x] Abonnementsresumé (månedlig sum, antal, næste fornyelse)
- [x] "Seneste køb" (3 stk.) åbner detaljeside
- [x] Klokken har badge med antal og åbner Veya i dag
- [x] Avatar åbner profil

## 5. Veya i dag
- [x] Viser alle notifikationer sorteret efter hast
- [x] Opdelt i "Kræver handling" og "Veya passer også på"
- [x] Handlingsknapper virker (se køb, se abonnement, markér betalt)
- [x] Udsæt og skjul virker og huskes
- [x] Tom tilstand vises, når der ingenting er

## 6. Notifikationsregler
- [x] Returfrist inden for X dage (eller overskredet). **Rettet:** en overskredet frist gav ingen notifikation. Nu vises "Returfristen udløb i går" i rødt i X dage efter fristen, hvis købet stadig er uafklaret.
- [x] Reklamationsret/garanti udløber snart (inden for 30 dage)
- [x] Abonnement fornyes inden for 2 dage
- [x] Prisstigning på abonnement
- [x] "Bruger du den stadig?" hver 60. dag
- [x] Regning forfalder snart / er forfalden
- [x] Budgetadvarsel ved over 80 % før dag 20
- [x] "Ingen ubetalte regninger" vises, når alt er betalt
- [x] Returnerede eller beholdte køb giver ikke længere returfrist-notifikation
- [x] Unit-tests dækker reglerne (`tests/notices.test.ts`, inkl. ny test for overskredet frist)

## 7. Scan
- [x] Kamera med hjørneramme og tag-billede-knap (hvor understøttet)
- [x] "Vælg fra billeder" virker (testet i Edge; iPhone: se sektion 17)
- [x] Fremdriftsvisning mens OCR kører
- [x] Billedbehandling før OCR: rotation, skalering, gråtone, kontrast, beskæring af baggrund (plus automatisk opretning)
- [x] Tesseract dan+eng hostet i appen, indlæses kun på Scan-skærmen
- [x] Parser finder: butik, dato, total, varer, betalingsmetode, bonnummer
- [x] Bonnummer (fx 20220107) forveksles ikke med dato
- [x] Datoformater: dd.mm.åå, dd-mm-åååå, dd/mm/åå, åååå-mm-dd
- [x] Butiksgenkendelse med uklar matching (Rema 1000, Netto, Føtex, Bilka m.fl.)
- [ ] Test med fixture `tests/fixtures/rema1000.jpg` rammer: Rema 1000, 18-10-2026, 20,00 kr., Mastercard, bon 20220107. **Mangler billedet:** filen findes ikke i repoet. Testen er skrevet og kører automatisk, når billedet lægges der. Samme felter rammes 8/8 på et syntetisk foto (`synthetic-rema.jpg`).
- [x] Gennemse-skærm med redigerbare felter; usikre felter markeret
- [x] OCR-tekst kan foldes ud (og rettes + læses igen)
- [x] Billedet komprimeres (maks ca. 1200 px) og gemmes
- [x] "Gem køb og opdater overblik" gemmer, viser toast og går til forsiden
- [x] "Tilføj manuelt" uden foto virker

## 8. Køb
- [x] Liste med søgning (produkt, butik, OCR-tekst)
- [x] Kategorifaner (Alle + brugte kategorier)
- [x] Status-hint pr. række (returfrist-nedtælling, garanti gemt, returneret)
- [x] Tilføj, rediger og slet manuelt
- [x] Returfrist og garantidato beregnes korrekt; kan redigeres
- [x] Detaljeside: dato, pris, butik, returfrist (orange når tæt på), garanti, betalingsmetode, note
- [x] "Se kvittering" med zoom
- [x] "Vis i butik": fuldskærm, høj kontrast, holder skærmen tændt (Wake Lock; virker kun på rigtig enhed, se 17)
- [x] "Jeg vil reklamere": færdig tekst + kvittering, deles via Web Share (reserve: kopiér + download, testet)
- [x] "Jeg har returneret den" / "Jeg beholder den" opdaterer status
- [x] Returnerede køb tæller ikke med i forbruget

## 9. Abonnementer
- [x] Månedlig total (årlige omregnet til månedlige) og antal
- [x] "Kommende betalinger" sorteret efter dato
- [x] Tilføj/rediger/slet med navn, plan, pris, interval, næste betaling, kategori
- [x] Hurtigvalg til kendte tjenester (Netflix, Spotify, Viaplay m.fl.)
- [x] Prisændring med ny pris og startdato giver notifikation og "+X kr."-mærke
- [x] "Opsig" markerer inaktiv og minder om at opsige hos udbyderen
- [x] Næste betaling rulles automatisk frem, når datoen er passeret
- [x] Årligt forbrug på abonnementer vises

## 10. Regninger
- [x] Liste med ubetalte først
- [x] Tilføj, rediger, slet
- [x] "Markér som betalt"
- [x] Gentagne regninger opretter næste automatisk
- [x] Kan nås fra forside og Plan. **Rettet:** forsiden havde intet direkte link, og Plan kun når der fandtes en regning. Nu har forsiden en Regninger-sektion med næste regning, og Plan har altid et "Regninger"-link og et kort for næste regning.

## 11. Plan
- [x] Fanerne Tidslinje og Kalender virker
- [x] Tidslinje: returfrister, garantiudløb, abonnementsfornyelser, regninger og egne begivenheder, grupperet pr. måned
- [x] Advarselsfarve på ting tæt på
- [x] Kalender: månedsgitter, prikker på dage med begivenheder, i dag markeret, skift måned
- [x] Tryk på en dag viser dagens ting
- [x] "+ Tilføj begivenhed" (titel, dato, tid, sted)
- [x] Kort: næste garantiudløb og næste regning (garantiudløb viser nu også årstal)
- [x] .ics-eksport af alle frister

## 12. Økonomi
- [x] Budgetkort: resterende, brugt, budget, statuslinje
- [x] Søjlediagram over 6 måneder, nuværende måned fremhævet
- [x] Donut med kategorifordeling og forklaring med beløb
- [x] Hurtig "Tilføj udgift" uden kvittering
- [x] Tallene stemmer med køb, abonnementer og regninger (`tests/budget.test.ts`)

## 13. Profil og indstillinger
- [x] Rediger navn og månedligt budget
- [x] Vælg hvor tidligt frister varsles (1/3/7 dage) og standard-returdage
- [x] "Eksportér mine data" (JSON inkl. billeder)
- [x] "Importér backup"
- [x] "Indlæs demodata"
- [x] "Slet alle data" med bekræftelse
- [x] Vejledning til "Føj til hjemmeskærm" (iOS og Android)
- [x] Tekst om at data kun gemmes på enheden
- [x] Slogan "Dit liv. Ét overblik."

## 14. Demodata
- [x] Datoer er relative til i dag
- [x] Indeholder køb (AirPods, New Balance, Matas, Føtex, Switch), 6 abonnementer (~597 kr./md.), regninger, begivenhed og 5 måneders historik
- [x] Giver både AirPods- og Netflix-notifikation
- [x] Demo-kvittering vises som billede

## 15. PWA og offline
- [x] Manifest med navn, ikoner (192, 512, maskable), start_url og scope
- [x] Service worker registreret
- [x] Appen starter og virker uden internet efter første indlæsning (testet i Edge med netværket slået fra)
- [x] Kan installeres på telefonen (alle krav i manifest og service worker er opfyldt; selve installationen: se 17)

## 16. Kvalitet
- [x] Beløb vises dansk (`1.899 kr.`), datoer dansk (`9. sep. 2026`)
- [x] Al synlig tekst er på dansk (ingen "NaN", "undefined" eller engelske knaptekster fundet på nogen skærm)
- [x] Knapper og ikoner har aria-labels; synligt fokus; god kontrast
- [x] Ingen fejl eller advarsler i browserens konsol
- [x] Ingen nøgler eller rigtige personlige kvitteringer i repoet (kun syntetiske testbonner og en tegnet demo-kvittering)

## 17. Skal testes på en rigtig telefon (marker som "ikke testet" indtil da)
- [ ] Kamera-visning på Scan (ikke testet)
- [ ] "Hold skærmen tændt" i Vis i butik (ikke testet)
- [ ] Dele-menu ved reklamation (ikke testet; reserven kopiér + download er testet)
- [ ] "Føj til hjemmeskærm" og offline-start (ikke testet på telefon; offline er testet i Edge)
- [ ] Scanning af en krøllet, rigtig bon (ikke testet)
