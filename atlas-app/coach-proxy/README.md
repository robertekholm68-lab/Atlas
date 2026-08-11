# Askr coach-proxy

Håller Anthropic-nyckeln på serversidan. Appen anropar den här, aldrig Claude
direkt.

## Varför

En nyckel i klienten kan läsas av vem som helst med telefonen i handen, och
ägaren betalar för allt de gör. Det gäller lika mycket i en app-bundle som i en
webbläsare — tröskeln är högre, problemet detsamma.

## Vad den INTE är

Ingen databas, inga konton, ingen användardata, inget minne. Den tar emot en
fråga, lägger på nyckeln, skickar tillbaka svaret. Det är den minsta serverdel
som löser problemet.

Frågan innehåller enbart härledda träningssiffror (readiness, volym, muskelnamn)
— aldrig namn, e-post eller rå historik.

## Deploy

1. Nytt Vercel-projekt med `coach-proxy/` som rot.
2. Miljövariabel `ANTHROPIC_API_KEY` i projektets inställningar.
   **Aldrig i koden, aldrig i git.**
3. Adressen läggs i appen som `COACH_PROXY`.

## Skydd

- CORS mot en vitlista med ursprung.
- 20 frågor per minut och IP. Fångar en trasig loop i appen, vilket är det
  verkliga fallet — inte en beslutsam angripare.
- Meddelanden över 12 000 tecken avvisas.

## Kostnad

Sonnet, max 400 tokens svar. En fråga kostar bråkdelar av ett öre. Taket ovan
finns för att en bugg inte ska kunna göra det till tusen kronor på en natt.
