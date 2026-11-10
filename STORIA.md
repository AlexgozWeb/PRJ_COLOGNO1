# Storia dell'app "Nota Spese Cologno 1"

App Next.js / React per il bilancio del Gruppo Scout Cologno 1. Login Google (NextAuth), dati su Google Sheets (file "App Config" + un foglio bilancio per annata, con un tab per branca), allegati su Vercel Blob.
Branca `dev` → progetto Vercel `prj-cologno-1-dev`; branca `master` → `prj-cologno-1`. I fogli Google (App Config e bilanci) sono condivisi fra i due ambienti, tranne l'anno attivo (`anno_attivo` per produzione, `anno_attivo_dev` per sviluppo). Gli allegati stanno in due store Blob privati separati, uno per ambiente.

## 1. Prima versione (28/10/2026) — sviluppo con Claude Code
- Creazione del progetto e app completa "Nota Spese Cologno 1".
- Login con Google; accesso limitato agli utenti autorizzati.
- Dashboard con le branche (LC, CdA, EG, Novi, Clan, CoCa) e pagina di dettaglio con tabella dei movimenti.
- Inserimento, modifica ed eliminazione dei movimenti su Google Sheets.
- Selettore dell'annata; le annate passate sono in sola lettura.
- Console admin: permessi utenti per branca, impostazione dell'anno attivo.

## 2. Rifiniture di interfaccia (28/10/2026)
- Etichette delle branche aggiornate; header della pagina branca più grande.
- Layout mobile: scroll orizzontale della tabella e padding responsivi.
- Logo del gruppo nella schermata di caricamento; pulsante di login nascosto durante il caricamento.
- Tabella più compatta, con icone emoji e testo più piccolo.
- Modalità chiara/scura con interruttore, correzioni dei contrasti (Permessi, colonna Codice).
- Aggiornamento automatico della pagina branca ogni 10 secondi.
- Icona CdA sostituita con l'impronta di lupo (poi ingrandita).

## 3. Branca Gruppo e ambiente dev (28–29/10/2026)
- Nuova branca **Gruppo** (tab, icona "C" blu, bordo blu).
- Primi deploy sul branch `dev` e badge "DEV" nell'header, poi badge ambiente dinamico da variabili d'ambiente.

## 4. Allegati (29/10/2026)
- Colonna J "ID_NOTA" e allegati prima su Google Drive.
- Errori di upload mostrati all'utente.
- Log degli errori nel pannello Admin.
- Header comune con pulsante "← Dashboard" in tutte le pagine.
- **Migrazione degli allegati a Vercel Blob** (percorso `allegati/{anno}/{CODICE}/{ID_NOTA}/`).
- Dettaglio nota con allegati, prima come pagina, poi come finestra modale.
- Logo del gruppo cliccabile verso la dashboard.

## 5. Permessi e limite allegati (29/10/2026, commit `4e67d18`)
- Corretto il range dei permessi (`A:H`) con gestione degli errori; la modifica dei permessi ora funziona anche per GRUPPO.
- Limite dimensione allegati configurabile da `Impostazioni` (`max_attachment_size_mb`, default 1 MB).

## 6. Allegati, ID Nota ed eliminazione (30/10/2026, commit `e3b53ad`)
- Colonna K "Allegati" nel foglio; pallino verde/grigio sulla riga ("Presenza/Assenza Allegati").
- Vista della nota in sola lettura; caricamento ed eliminazione dei file differiti al tasto "Salva". Un nuovo "Salva" non ricrea la nota e carica solo i file mancanti.
- Colonna "ID Nota" nella tabella.
- **In/Out obbligatorio**, con controllo anche lato server.
- **Eliminazione nota senza rompere le formule**: i valori delle note sottostanti salgono di una riga, le colonne con formula restano intatte. Controllo dell'ID per accessi simultanei (errore 409) e avviso se la rimozione degli allegati da Blob fallisce.
- **Liste valori da foglio**: In/Out, Modalità e Fondo letti dal foglio "Lista Valori" di App Config (cache 10 secondi), con colori di testo e sfondo per ogni valore.

## 7. Console admin "Lista Valori" (30/10/2026, commit `149e6a6`)
- Nuova sezione tra "Permessi utenti" e "Backup & Restore", con tre colonne: In/Out, Modalità, Fondo.
- Menu Testo e Sfondo con anteprima immediata; elenchi di colori dalle colonne "Tex Color Default" e "BG Color Default" del foglio; tasto **Salva** che aggiorna "Tex Color" e "BG Color".
- Aggiunta di nuovi valori (Modalità e Fondo) con colori, ordinamento alfabetico e "Altro" sempre in fondo.
- Cestino con conferma per eliminare un valore da Modalità e Fondo (In/Out non eliminabile).

## 8. Dashboard: branche assenti (30/10/2026, commit `149e6a6`)
- Nelle annate passate, il blocco di una branca senza foglio è disattivato: semitrasparente, non cliccabile, con il commento "Branca non presente nell'anno".

## 9. Allegati immagine: compressione, anteprima, rotazione (31/10/2026, commit `2d4e54a`)
- JPG/PNG ridotti nel browser prima dell'upload: lato lungo massimo 2000 px, JPEG qualità 0,8; se il file compresso non è più leggero resta l'originale. I PDF non vengono toccati.
- Anteprima con miniatura (clic per aprire a grandezza intera), dimensioni "prima → dopo", rotazione ↺/↻ e rimozione.
- L'upload avviene solo al "Salva"; il limite di `max_attachment_size_mb` si applica al file compresso.

## 10. Archivio cancellazioni (6/11/2026)
- Le note cancellate finiscono nel foglio «Storico Cancellazioni» e i loro allegati vengono spostati in `allegati/{anno}/cancellazioni/{ID_NOTA}/`.
- Dashboard admin «Storico cancellazioni» (sola lettura) con eliminazione definitiva di nota e allegati (solo admin, annata attiva).

## 11. Menu laterale, Report e Assistente AI (7–8/11/2026)
- Menu laterale con icone e elenco dei Report; Report «Prima Nota» (con icona dedicata).
- Voce «Assistente AI» nel menu, attivabile dal pannello admin e con aggiornamento immediato della voce.

## 12. Versioning e ambienti (9/11/2026, v2.1.0 → v2.4.0)
- Versione dell'app mostrata nel menu, nel login e nell'admin, con hash del commit; su `dev` appare `-dev`.
- Login con scelta dell'account Google e voce «Cambia utente».
- Anno attivo separato per lo sviluppo (`anno_attivo_dev`) e lettura delle impostazioni per nome.
- Pannello admin con sezioni a comparsa.
- **Guida utenti** statica su `/guida`, raggiungibile anche senza login dal link nella pagina di accesso.
- Rilasci con tag e Release GitHub: `v2.0.0` … `v2.4.0`.

## 13. Sicurezza e Blob privati (9–10/11/2026, v2.4.1 → v3.0.0)
Revisione di sicurezza dell'app e correzioni:
- **Download allegati** (`b3b3b6c`): accetta solo URL dello store Blob (host e percorso verificati), senza seguire redirect; nome del file ripulito.
- **Cancellazione allegati** (`f05459f`): consentita solo per i file della nota indicata.
- **Formule nel foglio** (`63b6f59`): i testi che iniziano con `=`, `+`, `-`, `@` vengono scritti come testo; validazione lato server di data (`gg/mm/aaaa`), importo e lunghezza dei testi.
- **Blob privati e separati** (`de1ab08`, v2.4.1): un store privato per `dev` (`scout-bilancio-allegati-priv_dev`) e uno per produzione (`scout-bilancio-allegati-priv_pro`). I file sono leggibili solo dopo il login, tramite la route di download; l'URL diretto risponde 403. L'archivio delle cancellazioni è visibile solo agli admin.
- **Allegati** (`2b9a3df`): validazione di `idNota` e pulizia del nome file in upload.
- **Intestazioni HTTP** (`362434c`, v2.4.2): `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`.
- **v3.0.0**: versione stabile con store Blob multipli (uno per ambiente) e correzioni di sicurezza.

## Da fare / note aperte
- Controllo dell'ID nota anche in modifica (PUT).
- Backfill della colonna K per le note già con allegati.
- Pulizia del codice legacy: `drive.ts`, `change_drive.md`, pagina `nota/[rowId]` e `NotaAllegati.tsx`.
- Validare il parametro `fileId` delle pagine rispetto all'elenco dei bilanci (`listBilanci()`): rinviato.
- Il file «App Config» (permessi, admin, Lista Valori) è ancora condiviso fra dev e produzione.
- Aggiornare la Guida (`public/guida.html`): riporta ancora «DEV / dati fittizi».
