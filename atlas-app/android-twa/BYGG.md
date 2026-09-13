# Askr som Trusted Web Activity

Ersätter WebView-skalet i `../android-app/`. Skillnaden är hela poängen: en TWA
är Chrome som app. Allt Chrome har finns därmed i den installerade appen —
**Web Bluetooth för pulsband**, mikrofonen utan brygga, notiser. WebView-skalet
saknar Web Bluetooth och kan aldrig para ett band.

Ingen egen Java. `LauncherActivity` ur android-browser-helper öppnar adressen,
verifierar mot sajten och visar appen utan adressfält.

## Samma paket-id, samma nyckel

`applicationId` är `se.atlas.app` och nyckeln är `atlas-signeringsnyckel.keystore`
(alias `atlas`) — samma som WebView-skalet. Då installeras TWA:n **över** den
gamla appen i stället för bredvid, utan avinstallation. `versionCode` är 2,
högre än skalets 1; annars vägrar Android.

**Skalets lagring följer inte med.** WebView och Chrome har skilda lagringar.
Innan uppdateringen: öppna gamla appen → Meny → Datasäkerhet → exportera
backup. Efter: öppna nya appen → Meny → Datasäkerhet → läs in. Det tar en minut
och är det enda sättet att inte tappa historiken.

## assetlinks.json — filen som tar bort adressfältet

Chrome litar på appen bara om sajten pekar tillbaka på nyckeln. Filen ligger
här som `assetlinks.json` och ska serveras på

    https://robertekholm68-lab.github.io/.well-known/assetlinks.json

Det är HOSTENS rot, inte `/Atlas/` — och roten serveras av ett eget repo som
måste heta exakt `robertekholm68-lab.github.io`. Skapa det, lägg filen på
`.well-known/assetlinks.json`, slå på Pages. Kontrollera med

    curl https://robertekholm68-lab.github.io/.well-known/assetlinks.json

Avtrycket i filen är nyckelns SHA256 ur `../android-app/BYGG.md`. Ett test i
sviten (`installera.test.jsx`) kräver att de två är identiska — byts nyckeln
ska båda bytas, och testet faller tills det är gjort.

Utan filen fungerar appen ändå, men med Chromes verktygsfält överst. Det är
ett tecken på att verifieringen saknas, inte ett fel i appen.

## Bygga

Android Studio, eller Gradle 8.7+ med Android SDK (`platforms;android-34`,
`build-tools;34.0.0`) och JDK 17.

`keystore.properties` i den här katalogen (ignorerad av git):

    storeFile=/sökväg/till/atlas-signeringsnyckel.keystore
    storePassword=…
    keyAlias=atlas
    keyPassword=…

Sedan:

    gradle :app:assembleRelease
    adb install -r app/build/outputs/apk/release/app-release.apk

`-r` uppdaterar över den installerade appen. Vägrar Android är det nyckeln
eller versionCode som skiljer sig.

## Prova på telefonen

1. Öppna Askr. Inget adressfält = verifieringen fungerar.
2. Starta ett pass, tryck ♡ i rubrikraden. Chromes väljare ska visa bandet.
3. OS-bakåtknappen går bakåt i appen, inte ut ur den — det sköter Chrome.

## Vad som INTE är verifierat härifrån

Det här projektet är skrivet utan Android SDK och utan Gradle i sessionen.
Manifest, gradle-filer och assetlinks är standardformen ur android-browser-
helper, men första bygget är den första körningen. Fel visar sig i Gradle på
din maskin, inte i CI.
