# Veya: funktionstjek

**Instruks til Claude Code:** Gå punkterne igennem ét ad gangen. Tjek i koden OG i den kørende app (start den, klik igennem, brug Edge/Chrome med mobilvisning). Marker hvert punkt med `[x]` hvis det virker, eller `[ ]` hvis det mangler eller er fejlbehæftet, og skriv en kort note ved fejl. Ret alt, der mangler eller er galt, kør tests, lint og type-check, commit og push. Afslut med en samlet liste: hvad virker, hvad blev rettet, hvad kan kun testes på en rigtig telefon.

---

## 1. Grundlag og hosting
- [ ] Appen bygger uden fejl (`npm run build`)
- [ ] Type-check, lint og alle tests består
- [ ] `base`-sti i `vite.config.ts` matcher repo-navnet
- [ ] HashRouter bruges, og genindlæsning på en under-side virker
- [ ] GitHub Actions-workflow deployer til Pages ved push til `main`
- [ ] Live-linket åbner appen uden fejl i konsollen
- [ ] Ingen requests til tredjeparter (fonte og OCR-data hostes i appen)
- [ ] README.md beskriver beslutninger og hvordan man kører appen

## 2. Design og layout
- [ ] Kun ét farvetema (lilla), samlet i CSS-variabler
- [ ] Logoet (to blade) vises i toppen og som app-ikon
- [ ] Skrifttyper: Poppins (overskrifter), Inter (knapper/menu), DM Sans (brødtekst)
- [ ] På desktop vises appen i telefon-ramme (390 px); på mobil i fuld skærm
- [ ] Bundmenu med 5 punkter: Overblik, Køb, Scan (hævet midterknap), Abonn., Plan
- [ ] Aktiv fane er markeret
- [ ] Tryk-områder er mindst 44 px; sikre områder på iPhone respekteres
- [ ] Tomme tilstande findes på alle lister

## 3. Onboarding
- [ ] Vises kun første gang
- [ ] 3 slides (overblik, scan, Veya i dag)
- [ ] Navn og månedligt budget kan indtastes (med forslag)
- [ ] Valg: "Prøv med demodata" eller "Start tomt"
- [ ] Data overlever genindlæsning

## 4. Overblik (forside)
- [ ] Hilsen efter tidspunkt (Godmorgen/Goddag/Godaften) med brugerens navn
- [ ] "Veya i dag"-kort med antal ting, der kræver opmærksomhed
- [ ] "Det vigtigste lige nu": op til 3 notifikationer, klikbare
- [ ] Budgetkort med forbrug, procent, resterende beløb og statuslinje
- [ ] Abonnementsresumé (månedlig sum, antal, næste fornyelse)
- [ ] "Seneste køb" (3 stk.) åbner detaljeside
- [ ] Klokken har badge med antal og åbner Veya i dag
- [ ] Avatar åbner profil

## 5. Veya i dag
- [ ] Viser alle notifikationer sorteret efter hast
- [ ] Opdelt i "Kræver handling" og "Veya passer også på"
- [ ] Handlingsknapper virker (se køb, se abonnement, markér betalt)
- [ ] Udsæt og skjul virker og huskes
- [ ] Tom tilstand vises, når der ingenting er

## 6. Notifikationsregler
- [ ] Returfrist inden for X dage (eller overskredet)
- [ ] Reklamationsret/garanti udløber snart (inden for 30 dage)
- [ ] Abonnement fornyes inden for 2 dage
- [ ] Prisstigning på abonnement
- [ ] "Bruger du den stadig?" hver 60. dag
- [ ] Regning forfalder snart / er forfalden
- [ ] Budgetadvarsel ved over 80 % før dag 20
- [ ] "Ingen ubetalte regninger" vises, når alt er betalt
- [ ] Returnerede eller beholdte køb giver ikke længere returfrist-notifikation
- [ ] Unit-tests dækker reglerne

## 7. Scan
- [ ] Kamera med hjørneramme og tag-billede-knap (hvor understøttet)
- [ ] "Vælg fra billeder" virker (også på iPhone)
- [ ] Fremdriftsvisning mens OCR kører
- [ ] Billedbehandling før OCR: rotation, skalering, gråtone, kontrast, beskæring af baggrund
- [ ] Tesseract dan+eng hostet i appen, indlæses kun på Scan-skærmen
- [ ] Parser finder: butik, dato, total, varer, betalingsmetode, bonnummer
- [ ] Bonnummer (fx 20220107) forveksles ikke med dato
- [ ] Datoformater: dd.mm.åå, dd-mm-åååå, dd/mm/åå, åååå-mm-dd
- [ ] Butiksgenkendelse med uklar matching (Rema 1000, Netto, Føtex, Bilka m.fl.)
- [ ] Test med fixture `tests/fixtures/rema1000.jpg` rammer: Rema 1000, 18-10-2026, 20,00 kr., Mastercard, bon 20220107
- [ ] Gennemse-skærm med redigerbare felter; usikre felter markeret
- [ ] OCR-tekst kan foldes ud
- [ ] Billedet komprimeres (maks ca. 1200 px) og gemmes
- [ ] "Gem køb og opdater overblik" gemmer, viser toast og går til forsiden
- [ ] "Tilføj manuelt" uden foto virker

## 8. Køb
- [ ] Liste med søgning (produkt, butik, OCR-tekst)
- [ ] Kategorifaner (Alle + brugte kategorier)
- [ ] Status-hint pr. række (returfrist-nedtælling, garanti gemt, returneret)
- [ ] Tilføj, rediger og slet manuelt
- [ ] Returfrist og garantidato beregnes korrekt; kan redigeres
- [ ] Detaljeside: dato, pris, butik, returfrist (orange når tæt på), garanti, betalingsmetode, note
- [ ] "Se kvittering" med zoom
- [ ] "Vis i butik": fuldskærm, høj kontrast, holder skærmen tændt (Wake Lock)
- [ ] "Jeg vil reklamere": færdig tekst + kvittering, deles via Web Share (reserve: kopiér + download)
- [ ] "Jeg har returneret den" / "Jeg beholder den" opdaterer status
- [ ] Returnerede køb tæller ikke med i forbruget

## 9. Abonnementer
- [ ] Månedlig total (årlige omregnet til månedlige) og antal
- [ ] "Kommende betalinger" sorteret efter dato
- [ ] Tilføj/rediger/slet med navn, plan, pris, interval, næste betaling, kategori
- [ ] Hurtigvalg til kendte tjenester (Netflix, Spotify, Viaplay m.fl.)
- [ ] Prisændring med ny pris og startdato giver notifikation og "+X kr."-mærke
- [ ] "Opsig" markerer inaktiv og minder om at opsige hos udbyderen
- [ ] Næste betaling rulles automatisk frem, når datoen er passeret
- [ ] Årligt forbrug på abonnementer vises

## 10. Regninger
- [ ] Liste med ubetalte først
- [ ] Tilføj, rediger, slet
- [ ] "Markér som betalt"
- [ ] Gentagne regninger opretter næste automatisk
- [ ] Kan nås fra forside og Plan

## 11. Plan
- [ ] Fanerne Tidslinje og Kalender virker
- [ ] Tidslinje: returfrister, garantiudløb, abonnementsfornyelser, regninger og egne begivenheder, grupperet pr. måned
- [ ] Advarselsfarve på ting tæt på
- [ ] Kalender: månedsgitter, prikker på dage med begivenheder, i dag markeret, skift måned
- [ ] Tryk på en dag viser dagens ting
- [ ] "+ Tilføj begivenhed" (titel, dato, tid, sted)
- [ ] Kort: næste garantiudløb og næste regning
- [ ] .ics-eksport af alle frister

## 12. Økonomi
- [ ] Budgetkort: resterende, brugt, budget, statuslinje
- [ ] Søjlediagram over 6 måneder, nuværende måned fremhævet
- [ ] Donut med kategorifordeling og forklaring med beløb
- [ ] Hurtig "Tilføj udgift" uden kvittering
- [ ] Tallene stemmer med køb, abonnementer og regninger

## 13. Profil og indstillinger
- [ ] Rediger navn og månedligt budget
- [ ] Vælg hvor tidligt frister varsles (1/3/7 dage) og standard-returdage
- [ ] "Eksportér mine data" (JSON inkl. billeder)
- [ ] "Importér backup"
- [ ] "Indlæs demodata"
- [ ] "Slet alle data" med bekræftelse
- [ ] Vejledning til "Føj til hjemmeskærm" (iOS og Android)
- [ ] Tekst om at data kun gemmes på enheden
- [ ] Slogan "Dit liv. Ét overblik."

## 14. Demodata
- [ ] Datoer er relative til i dag
- [ ] Indeholder køb (AirPods, New Balance, Matas, Føtex, Switch), 6 abonnementer (~597 kr./md.), regninger, begivenhed og 5 måneders historik
- [ ] Giver både AirPods- og Netflix-notifikation
- [ ] Demo-kvittering vises som billede

## 15. PWA og offline
- [ ] Manifest med navn, ikoner (192, 512, maskable), start_url og scope
- [ ] Service worker registreret
- [ ] Appen starter og virker uden internet efter første indlæsning
- [ ] Kan installeres på telefonen

## 16. Kvalitet
- [ ] Beløb vises dansk (`1.899 kr.`), datoer dansk (`9. sep. 2026`)
- [ ] Al synlig tekst er på dansk
- [ ] Knapper og ikoner har aria-labels; synligt fokus; god kontrast
- [ ] Ingen fejl eller advarsler i browserens konsol
- [ ] Ingen nøgler eller rigtige personlige kvitteringer i repoet

## 17. Skal testes på en rigtig telefon (marker som "ikke testet" indtil da)
- [ ] Kamera-visning på Scan
- [ ] "Hold skærmen tændt" i Vis i butik
- [ ] Dele-menu ved reklamation
- [ ] "Føj til hjemmeskærm" og offline-start
- [ ] Scanning af en krøllet, rigtig bon
