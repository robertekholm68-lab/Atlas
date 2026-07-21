# ATLAS som Android-app

Ett tunt skal som kör den publicerade appen i en WebView. Ingen kod från
`src/` dupliceras här — skalet pekar bara på `atlas2.html` på GitHub Pages.

## Varför https och inte inbakade filer

Appen laddas från nätet, inte från `file:///android_asset/`. På `file://` blir
ursprunget "null": localStorage blir opålitligt och service workern vägrar
registrera sig. Med https får appen ett riktigt ursprung, lagringen håller, och
service workern cachar allt så att appen startar offline efter första besöket.
Priset är att första starten kräver nät.

## Konsekvens att känna till

WebViewens lagring är **skild från Chromes**. Data du loggat i Chrome syns
alltså inte i appen, och tvärtom. Välj ett ställe att logga på, eller använd
överföringsbryggan.

## Bygga

Kräver JDK 17 (d8 i build-tools 34 fungerar inte under JDK 21) och Android SDK
med `platforms;android-34` samt `build-tools;34.0.0`.

```
aapt2 compile --dir res -o build/compiled/res.zip
aapt2 link -o build/base.apk -I $PLAT --manifest AndroidManifest.xml \
  --java build/gen --min-sdk-version 24 --target-sdk-version 34 \
  build/compiled/res.zip
javac --release 17 -classpath $PLAT -d build/classes $(find src build/gen -name "*.java")
d8 --min-api 24 --lib $PLAT --output build/ $(find build/classes -name "*.class")
cp build/base.apk build/unsigned.apk && zip -qj build/unsigned.apk build/classes.dex
zipalign -f -p 4 build/unsigned.apk build/aligned.apk
apksigner sign --ks <nyckel> --ks-key-alias atlas --min-sdk-version 24 \
  --out build/ATLAS.apk build/aligned.apk
```

## Fallgrop: inga anonyma klasser

`d8` i build-tools 34 kraschar på anonyma inre klasser i det här projektet
(`NullPointerException` i R8:s klassgraf). Därför är `AtlasWebViewClient` och
`AtlasChromeClient` namngivna klasser i egna filer, och lambdan i
behörighetshanteringen är ersatt av en namngiven `Runnable`. Behåll det så.

## Signeringsnyckeln

`atlas-signeringsnyckel.keystore`, alias `atlas`. **Utan exakt samma nyckel går
appen inte att uppdatera** — Android vägrar installera över en app signerad med
en annan nyckel, och användaren måste avinstallera först och förlorar sin data.
Nyckeln ligger medvetet INTE i repot.

SHA256: B1:12:F6:60:E4:D1:07:55:44:51:0E:14:96:C9:D7:16:40:A7:39:C8:33:CC:6B:B6:5F:4B:C3:E8:D0:30:E2:F0
