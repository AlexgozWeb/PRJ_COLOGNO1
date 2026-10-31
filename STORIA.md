# Storia dell'app "Nota Spese Cologno 1"

App Next.js / React per il bilancio del Gruppo Scout Cologno 1. Login Google (NextAuth), dati su Google Sheets (file "App Config" + un foglio bilancio per annata, con un tab per branca), allegati su Vercel Blob.
Branca `dev` → progetto Vercel `prj-cologno-1-dev`; branca `master` → `prj-cologno-1`. I dati (Sheets e Blob) sono condivisi fra i due ambienti.

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

## Da fare / note aperte
- Controllo dell'ID nota anche in modifica (PUT).
- Backfill della colonna K per le note già con allegati.
- Pulizia del codice legacy: `drive.ts`, `change_drive.md`, pagina `nota/[rowId]` e `NotaAllegati.tsx`.
- Dati condivisi fra dev e produzione; blob con accesso pubblico.
