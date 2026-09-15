# Lansering i Google Play — checklista

Allt som är **mitt** att göra är gjort. Det som står kvar kräver en maskin med
Android SDK, en signeringsnyckel och ett Google-konto — tre saker som inte finns
i den här sessionen.

Ordningen nedan är vald så att inget steg väntar på ett senare.

---

## 1. Assetlinks — utan den visar appen ett adressfält

En TWA är Chrome i helskärm. Google verifierar att du äger både appen och
webbplatsen genom att läsa en fil på **domänens rot**. Stämmer den inte startar
appen ändå, men med webbläsarens adressfält kvar överst — och då ser den inte ut
som en app.

Filen ligger färdig i `atlas-app/android-twa/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "se.atlas.app",
    "sha256_cert_fingerprints": ["B1:12:F6:60:E4:D1:07:55:44:51:0E:14:96:C9:D7:16:40:A7:39:C8:33:CC:6B:B6:5F:4B:C3:E8:D0:30:E2:F0"]
  }
}]
```

**Gör så här:**

1. Skapa ett nytt publikt GitHub-repo som heter **exakt** `robertekholm68-lab.github.io`.
   Namnet är inte valfritt — det är så GitHub vet att repot är din användarsajt.
2. Lägg filen i `.well-known/assetlinks.json` i det repots rot.
3. Lägg också en tom fil som heter `.nojekyll` bredvid — utan den kan Pages
   strippa kataloger som börjar med punkt.
4. Slå på Pages för repot (Settings → Pages → Deploy from branch → main).
5. Kontrollera att filen svarar:
   `https://robertekholm68-lab.github.io/.well-known/assetlinks.json`

**Varför i rotdomänen och inte i Atlas-repot:** verifieringen läser alltid
domänens rot, aldrig en underkatalog. `robertekholm68-lab.github.io/Atlas/…`
duger inte.

**Fingeravtrycket ovan är från `android-app/BYGG.md`** — samma nyckel som
WebView-skalet signerades med. Signerar du TWA:n med en annan nyckel måste
fingeravtrycket bytas, annars misslyckas verifieringen tyst.

---

## 2. Bygg TWA:n

Följ `atlas-app/android-twa/BYGG.md`. Kräver **JDK 17** — d8 i build-tools 34
kraschar under JDK 21.

Kontrollera på telefonen innan du går vidare: installera APK:n, öppna appen och
se efter att **inget adressfält** syns överst. Gör det ändå har assetlinks inte
gått igenom, och då är det steg 1 som ska lagas — inte bygget.

---

## 3. Play Console

- 25 dollar, en gång.
- Identitetsverifiering. Den tar den tid den tar; börja med den.
- **Kontrollera den aktuella regeln om testare.** Google har krävt att nya
  personliga utvecklarkonton kör ett stängt test med ett antal testare under ett
  antal dagar innan produktionssläpp. Reglerna ändras, och jag kan inte läsa dem
  härifrån — men är den kvar lägger den veckor på schemat oavsett hur klar appen
  är. Ta reda på det först, inte sist.

---

## 4. Butikssidan

Färdig text att klistra in: **`play-butikstext.md`** i den här mappen. Där finns
appnamn, kort och fullständig beskrivning, kategori, svaren till
datasäkerhetsformuläret och en lista på vilken grafik som saknas.

Integritetspolicyn ligger publicerad på
`https://robertekholm68-lab.github.io/Atlas/integritet.html` och kopieras dit av
deploy-flödet. Verifieringssteget kräver att den finns — försvinner filen
stoppas publiceringen i stället för att länken tyst börjar ge 404.

---

## 5. Det som INTE ska göras nu

**Betalningen.** Prissättningen är oavgjord, och det finns ingen gräns mellan
gratis och premium i koden. Släpp gratis först: då får du användare och en känsla
för om folk stannar, innan du bygger en betalvägg för en app ingen ännu prövat.
Se backlogposten "Prenumeration och prissättning" i `current-build.md`.

**App Store.** Kräver Capacitor, en Mac med Xcode och 99 dollar om året. Vänta
tills Play visat om appen har användare.

**Fler språk.** ~1 400 svenska strängar i vyer och motorer, plus en
livsmedelsdatabas och 276 recept som är svenska i sak och inte går att översätta.
Rätt läge är när du vet att appen ska utanför Sverige — inte innan.

---

## Vad som saknas utanför koden, i ett svep

| Sak | Vem | Ungefär |
|---|---|---|
| Repot `robertekholm68-lab.github.io` med assetlinks | Du | Minuter |
| TWA-bygge med rätt nyckel | Du | En kväll |
| Play Console-konto och verifiering | Du | Dagar |
| Eventuell testarperiod enligt Googles regler | Google | Veckor |
| Utvald bild 1024×500 | Jag, om du säger till | Timme |
| Skärmbilder från appen | Du | Halvtimme |
| Appikon som 512×512 PNG | **Klar** — `play-ikon-512.png` | — |
