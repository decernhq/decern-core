# Decern – Documentazione funzionalità

**Decern** è il registro delle decisioni tecniche del tuo team. Consente di documentare, condividere e tracciare le scelte architetturali e tecniche in modo strutturato (ADR-style), organizzato per progetto e workspace, con supporto a piani a pagamento e collaborazione.

---

## 1. Panoramica prodotto

- **Cosa fa**: Registro centralizzato delle **decisioni tecniche** (contesto, opzioni, decisione, conseguenze) organizzate per **progetto** e **workspace**.
- **Per chi**: Team di sviluppo, product/engineering, freelance che vogliono tracciare il “perché” delle scelte tecniche.
- **Valore**: Allineare il team, onboarding più rapido, storico delle decisioni e collegamenti tra decisioni (sostituzioni, riferimenti).

---

## 2. Autenticazione

| Funzionalità | Descrizione |
|--------------|-------------|
| **Registrazione** | Signup con email e password. Opzionali: nome utente, ruolo. Redirect post-signup configurabile (es. `/pricing`, `/dashboard`). |
| **Conferma email** | Supabase Auth invia email di conferma (SMTP custom, es. Brevo). L’utente deve confermare l’email per accedere. |
| **Login** | Login con email/password. Supporto a `?next=` per tornare alla pagina richiesta dopo il login (es. `/login?next=/pricing`). |
| **Logout** | Logout dalla dashboard (header). |
| **Profilo** | Esteso tramite tabella `profiles` (nome, ruolo, email da auth). |

---

## 3. Workspace

| Funzionalità | Descrizione |
|--------------|-------------|
| **Workspace di default** | Al primo accesso (nessun workspace) viene mostrata la schermata “Preparando il tuo workspace”: viene creato un workspace di default (“Mio workspace”) e l’utente viene reindirizzato alla dashboard. |
| **Selezione workspace** | In sidebar: switcher per cambiare workspace attivo. Il workspace selezionato è persistito in cookie. |
| **Limiti per piano** | Free/Team 1 workspace. Business: workspace illimitati. Enterprise: illimitati (configurabili). Se il piano permette solo N workspace, in switcher e cookie sono visibili/utilizzabili solo i primi N (per data di creazione). |
| **Pagina Workspace** | Lista workspace, creazione nuovo (solo se il piano lo consente), gestione membri e inviti del workspace corrente. |
| **Crea workspace** | Form “Crea nuovo workspace” (nome). Visibile solo su piano Business (o Enterprise). Messaggio esplicito per utenti Free/Team su come sbloccare più workspace (Passa a Business). |

---

## 4. Progetti

| Funzionalità | Descrizione |
|--------------|-------------|
| **CRUD** | Creazione, lettura, modifica, eliminazione progetti. Ogni progetto appartiene al workspace corrente. |
| **Campi** | Nome, descrizione (opzionale). |
| **Limiti** | Free: 1 progetto. Pro/Business/Enterprise: progetti illimitati (o secondo limiti piano). |
| **Lista progetti** | Pagina “Progetti” con elenco e link alle decisioni per progetto. |
| **Dettaglio progetto** | Pagina progetto con nome, descrizione, link a “Modifica” e “Elimina”, e lista decisioni del progetto. |

---

## 5. Decisioni

### 5.1 Struttura (ADR-style)

| Campo | Descrizione |
|-------|-------------|
| **Titolo** | Titolo breve della decisione. |
| **Stato** | Valori in inglese in DB/API: `proposed`, `approved`, `superseded`, `rejected`. In UI tradotti in italiano (Proposta, Approvata, Superata, Rifiutata). Modificabile dalla lista e dalla pagina dettaglio. |
| **Progetto** | Progetto di appartenenza (obbligatorio). |
| **Contesto** | Contesto e problema che hanno portato alla decisione. |
| **Opzioni considerate** | Elenco di opzioni valutate. |
| **Decisione** | Decisione finale. |
| **Conseguenze** | Conseguenze positive e negative. |
| **Tag** | Tag per categorizzazione e filtri (suggerimenti da tag esistenti + liberi). |
| **Link esterni** | URL con etichetta opzionale (RFC, documentazione, ecc.). |
| **Pull Request** | Una o più URL di pull request associate alla decisione (campo separato dai link esterni; mostrato prima dei link esterni). |
| **Decisione collegata** | Link a una decisione precedente che questa “sostituisce” (relazione supersede). |
| **Superata da** | Visualizzazione delle decisioni che sostituiscono questa (relazione inversa). |

### 5.2 Azioni

| Funzionalità | Descrizione |
|--------------|-------------|
| **Crea decisione** | Form completo. Possibile avviare da testo libero con **generazione AI** (vedi sotto). |
| **Modifica decisione** | Stesso form, con dati precompilati. |
| **Elimina decisione** | Eliminazione con conferma. |
| **Duplica decisione** | Dalla lista: icona “duplica” con tooltip “Duplica decisione”. Apre il form “Nuova decisione” con campi precompilati dalla decisione selezionata (titolo con suffisso “(copia)”). |
| **Cambio stato** | Dalla lista (select per riga) o dalla pagina dettaglio: proposta → approvata/rifiutata/superata. |
| **Copia in Markdown** | Dalla pagina dettaglio: copia del contenuto in formato Markdown negli appunti. |
| **Scarica .md** | Dalla pagina dettaglio: download di un file `.md` con il dettaglio della decisione (nome file derivato dal titolo). |

### 5.3 Generazione AI da testo

| Funzionalità | Descrizione |
|--------------|-------------|
| **Flusso** | In “Nuova decisione” è possibile incollare un testo libero (es. note, verbale) e richiedere la generazione. L’API estrae titolo, contesto, opzioni, decisione, conseguenze e tag. |
| **Limiti** | Il numero di generazioni al mese dipende dal piano (Free: 5, Team 300, Business: 1.500, Enterprise: illimitato). Il conteggio è per utente (tabella `ai_generations_usage`). |
| **Tag** | L’AI usa preferibilmente tag già esistenti nel workspace; tag generici sono filtrati lato server. |
| **Dopo la generazione** | I campi vengono precompilati nel form; l’utente può modificare e salvare. |

### 5.4 Lista e filtri

| Funzionalità | Descrizione |
|--------------|-------------|
| **Lista decisioni** | Tabella con: titolo, contesto (anteprima), progetto, autore, stato, tag, data. Ordinamento e paginazione (24 per pagina). |
| **Ricerca** | Campo di ricerca su titolo e contesto. |
| **Filtri** | Per stato (proposta, approvata, superata, rifiutata), progetto, intervallo date (da/a), tag (multiselezione). |
| **Ordinamento** | Per titolo, progetto, autore, stato, data (asc/desc). |
| **Azioni in riga** | Cambio stato (select), link al dettaglio, link duplica (con tooltip “Duplica decisione”). |

---

## 6. Team e inviti

| Funzionalità | Descrizione |
|--------------|-------------|
| **Invita per email** | Dalla pagina Workspace: form per inserire un’email. Crea un invito con link univoco (token) valido 7 giorni. L’invitato riceve il link (condiviso dall’utente, es. via email esterna). |
| **Link invito pubblico** | `/invite/[token]`: se l’utente non è loggato, vede “Invito al workspace [nome]” e può “Completa registrazione” (signup con quell’email) o “Accedi”. Dopo login/signup viene reindirizzato alla pagina dashboard per accettare l’invito. |
| **Accetta invito** | `/dashboard/invite/[token]`: solo per utenti loggati. Se l’email dell’invito coincide con l’utente, può accettare e entrare nel workspace. Altrimenti messaggio che l’invito è per un’altro indirizzo. |
| **Membri workspace** | Lista membri con nome/email e azione “Rimuovi” (proprietario può rimuovere membri). |
| **Inviti in sospeso** | Lista inviti pendenti con email e azione “Revoca”. |
| **Limiti inviti** | Numero massimo di utenti per workspace in base al piano (Free: 1, Team 5, Business: 20, Enterprise: illimitato). |

---

## 7. Piani e fatturazione

### 7.1 Piani

| Piano | Prezzo | Workspace | Progetti | Utenti/workspace | Decisioni | Generazioni AI/mese |
|------|--------|-----------|----------|------------------|-----------|---------------------|
| **Free** | €0 | 1 | 1 | 1 | 30 totali | 5 |
| **Pro** | €19/mese | 1 | Illimitati | 5 | Illimitate | 300 |
| **Business** | €49/mese | Illimitati | Illimitati | 20 | Illimitate | 1.500 |
| **Enterprise** | Su richiesta | Illimitati | Illimitati | Illimitati | Illimitate | Illimitate |

### 7.2 Funzionalità billing

| Funzionalità | Descrizione |
|--------------|-------------|
| **Pagina Prezzi** | `/pricing`: confronto Free, Team, Business, Enterprise. Pulsanti “Inizia gratis” (Free), “Scegli Pro” / “Scegli Business” (checkout Stripe), “Contattaci” (Enterprise, mailto). |
| **Checkout Stripe** | Scelta piano Business o Business → creazione sessione Stripe Checkout → redirect a Stripe. Dopo pagamento, webhook aggiorna la subscription nel DB. |
| **Customer Portal** | In Impostazioni, per utenti Pro/Business: pulsante “Gestisci abbonamento” che apre il Stripe Customer Portal (cambio piano, metodo di pagamento, cancellazione). |
| **Sidebar upgrade** | Free: pulsante “Passa a Team. Team: pulsante “Passa a Business”. Business/Enterprise: nessun pulsante. |
| **Impostazioni – Abbonamento** | Mostra piano corrente e prezzo. Free: pulsanti “Passa a Team" e “Passa a Business”. Enterprise: messaggio “Contatta il supporto”. |
| **Applicazione limiti** | I limiti sono applicati lato server: creazione workspace, progetto, invito, decisione e uso generazione AI verificano il piano (e gli override su subscription) prima di consentire l’azione. |

---

## 8. Impostazioni utente

| Funzionalità | Descrizione |
|--------------|-------------|
| **Account** | Nome (full name), ruolo (da elenco predefinito), email (sola lettura da auth), ID utente. |
| **Abbonamento** | Piano corrente, prezzo, pulsanti upgrade o “Gestisci abbonamento” (Stripe Portal). |
| **Variabile PLAN_OVERRIDE** | (Opzionale, env) Override del piano mostrato per test (free/pro/Business/enterprise). |

---

## 9. Dashboard

| Funzionalità | Descrizione |
|--------------|-------------|
| **Home** | Benvenuto, statistiche (progetti, decisioni totali, per stato: proposta, approvata, superata, rifiutata), ultime decisioni, lista progetti, quick actions (Nuovo progetto, Nuova decisione, Vedi decisioni). Sezione “Come iniziare” se non ci sono progetti. |
| **Layout** | Sidebar (logo, workspace switcher, nav: Dashboard, Progetti, Decisioni, Workspace, Impostazioni, pulsante upgrade se Free/Pro), header con email e logout, area contenuto. |
| **Pulsante “Nuova decisione”** | FAB (floating action button) per aprire la creazione decisione. |

---

## 10. Riepilogo tecnico (per sviluppatori)

- **Auth**: Supabase Auth (email/password, conferma email, SMTP custom).
- **DB**: PostgreSQL (Supabase), RLS, migrazioni in `supabase/migrations`.
- **Payments**: Stripe (Checkout, Customer Portal, webhook per subscription e fattura).
- **AI**: API route `POST /api/decisions/generate-from-text` (uso limiti da piano e `ai_generations_usage`).
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind; componenti UI e dashboard in `components/`.

Questa documentazione descrive le funzionalità a livello di prodotto; per setup DB, env e deploy si veda `README.md` e `docs/DATABASE_SETUP.md`.
