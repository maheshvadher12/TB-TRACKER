# Google Drive બેકઅપ – એક વખતનું સેટઅપ

Settings → **Backup & Restore (Google Drive)** માં બટન દબાવતા જ બેકઅપ તમારા Google Drive ના
**TB Tracker** ફોલ્ડરમાં અપલોડ થશે. બેકઅપમાં દર્દીની માહિતી, ફોલોઅપ ડીટેલ,
વર્કર નંબર, મેસેજ ટેમ્પ્લેટ અને માસિક રિપોર્ટ – બધું આવે છે. Restore પણ Drive માંથી જ થશે.

એપ ફક્ત પોતે બનાવેલી ફાઈલ જ જોઈ શકે છે (scope: `drive.file`), તમારા Drive ની બીજી ફાઈલો નહિ.

Google ની સુરક્ષા માટે એક વખત નીચેનું કરવું પડે (લગભગ 10 મિનિટ, ફ્રી):

## 1) Google Cloud પ્રોજેક્ટ
1. https://console.cloud.google.com ખોલો → ઉપર **New Project** → નામ `TB FUP Tracker`.
2. **APIs & Services → Library** → **Google Drive API** → **Enable**.

## 2) OAuth consent screen
1. **APIs & Services → OAuth consent screen** → User type: **External** → App name `TB FUP Tracker`, તમારો ઈમેલ નાખો.
2. **Scopes** માં `.../auth/drive.file` ઉમેરો (આ non-sensitive છે, verification નથી જોઈતું).
3. **Audience / Publish app** → **In production** કરો. (Testing માં રાખશો તો ટેસ્ટ યુઝર તરીકે તમારો Gmail ઉમેરવો પડશે અને દર 7 દિવસે ફરી લોગીન માંગશે.)

## 3) બે Client ID બનાવો (**APIs & Services → Credentials → Create credentials → OAuth client ID**)
**A. Android**
- Application type: **Android**
- Package name: `in.phcpransli.tbfuptracker.app26`
- SHA-1: `69:22:20:47:37:2E:72:20:EC:58:55:F7:38:2E:5D:3A:33:4C:2A:E1`
  (આ `signing/tracker.jks` ની છે. GitHub Actions log માં પણ "SHA-1 of signing key" માં છપાય છે.)

**B. Web application** ← આ ID એપ માં નાખવાની છે
- Application type: **Web application** → Create
- મળેલ **Client ID** (`xxxx.apps.googleusercontent.com`) કોપી કરો.

> બંને Client ID એક જ પ્રોજેક્ટમાં હોવા જોઈએ.

## 4) એપ માં ID નાખો
`www/gdrive.js` ની ઉપરની લાઈન બદલો:

```js
var WEB_CLIENT_ID = 'xxxx.apps.googleusercontent.com';
```
બસ આટલી જ જગ્યાએ. GitHub build આ જ ID આપમેળે `capacitor.config.json` માં મૂકી દે છે.
પછી ફાઈલો GitHub પર push કરો → Actions માંથી નવી APK ડાઉનલોડ કરી જૂની પર install (update) કરો.
Signing key સરખી હોવાથી જૂનો ડેટા જળવાઈ રહેશે – છતાં install પહેલાં જૂની એપ માં જૂની રીતે બેકઅપ લઈ લેવું સારું.

## વાપરવું
- **Settings → Account (Google Drive)** → “Select / Change Gmail” → જે Gmail પસંદ કરો (અથવા Add another account) તેના Drive માં જ બેકઅપ થશે.
- **બીજા ફોન પર:** એપ install કરો → Account માં **એ જ Gmail** પસંદ કરો → Restore from Google Drive. બેકઅપ/રીસ્ટોર ફક્ત Drive ના **TB Tracker** ફોલ્ડરથી જ થાય છે, ફોન પર કોઈ ફાઈલ સેવ થતી નથી.
- **Backup to Google Drive** → પહેલી વખત Google account પસંદ કરવાનું કહેશે, પછી સીધું અપલોડ.
- **Restore from Google Drive** → બેકઅપની યાદી (નવી પહેલા) → જે પસંદ કરો તે restore થશે.

## Default account અને Settings password
- Default Gmail: `maheshvadher12@gmail.com` (કાઢી શકાતું નથી). કોઈ પણ ફોનમાં એપ હોય, બેકઅપ આ Gmail ના Drive માં જ જાય છે. નવા ફોનમાં પહેલી વખત Google આ account પસંદ કરવાનું કહેશે (ખોટું પસંદ કરશો તો એપ ચેતવણી આપશે).
- Settings ટેબમાં બધું દેખાય છે; ફેરફાર કરવા (વર્કર નંબર, ટેમ્પ્લેટ, Restore/Import, Google account) ત્યારે જ password (`RNTCP@123`) મંગાય છે. એક વાર નાખ્યા પછી ટેબ છોડો ત્યાં સુધી ફરી નથી મંગાતો.
- Settings → **Settings Password** માં lock ON/OFF અને password બદલવાનું (જૂનો password નાખો તો જ નવો સેટ થાય) છે.
