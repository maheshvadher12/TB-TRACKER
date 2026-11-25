# Google Drive Backup – એક વખતનું સેટઅપ (Gmail ના માલિક માટે)

1. જે Gmail ની Drive માં backup સેવ કરવો છે તેમાં લૉગિન કરી https://script.google.com ખોલો → **New project**.
2. `apps-script/BackupServer.gs` ની આખી કૉડ પેસ્ટ કરો. ઉપર `KEY` માં તમારી પોતાની secret key લખો.
3. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access: Anyone* → Deploy → Allow (Drive permission).
4. મળેલી `.../exec` URL અને key, `www/index.html` માં `const AB_URL='',AB_KEY='',AB_MAIL=''` માં (AB_MAIL = તમારું Gmail) એક વખત લખી દો (પછી કોઈ ફોનમાં URL/key લખવાની જરૂર નહીં).
5. એપમાં **Settings → Account** માં એ જ Gmail લખી **Save & Connect** દબાવો.
6. હવે **Backup & Restore** માં **Backup** = Drive માં સેવ, **Restore** = Drive ના નવીનતમ backup થી restore.

નોંધ: Gmail સ્ક્રિપ્ટના માલિકના Gmail સાથે મેળ ન ખાય તો backup સ્વીકારાતું નથી.

## Password reset (Forgot password)
- Settings ખોલતી વખતે પાસવર્ડ ભૂલી જાઓ તો "Forgot password?" દબાવો → તમારા Gmail પર reset link આવશે.
- લિંક ખોલી નવો પાસવર્ડ સેટ કરો, પછી એપમાં "I have set it – Apply" દબાવો.
- નવી સ્ક્રિપ્ટ ફરી deploy કરતી વખતે ઈ-મેલ મોકલવાની (Gmail) મંજૂરી માંગે તો **Allow** કરો: Deploy → Manage deployments → Edit → New version.
