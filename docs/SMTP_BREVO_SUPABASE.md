# Email signup con Brevo + Supabase Auth

Le email di conferma alla registrazione sono inviate da **Supabase Auth** usando l’SMTP configurato nella dashboard. Se hai impostato Brevo come SMTP e le email non partono, controlla i punti sotto.

## Configurazione Supabase

**Dashboard Supabase** → **Authentication** → **SMTP Settings** (o **Auth** → **Providers** → **Email** / link alle impostazioni SMTP).

- **Enable Custom SMTP**: attivo
- **Sender email**: deve essere un **mittente verificato** in Brevo (es. `noreply@tudominio.com`), **non** l’email di login SMTP
- **Sender name**: nome che vedono gli utenti (es. "Decern")
- **Host**: `smtp-relay.brevo.com`
- **Port**: `587` (TLS) oppure `465` (SSL) o `2525`
- **Username**: l’**SMTP login** mostrato nella pagina Brevo SMTP (email tipo `xxx@sendinblue.com` o il login che Brevo ti assegna)
- **Password**: la **SMTP key** (chiave SMTP), **non** la password dell’account Brevo e **non** l’API key

## Credenziali Brevo (causa frequente di problemi)

1. Vai in Brevo: **Settings** → **SMTP & API** → **SMTP**.
2. Usa **SMTP login** e **SMTP key** (puoi rigenerarli da quella pagina).
3. **Non** usare:
   - la password del tuo account Brevo
   - una **API key** (v3) di Brevo

Se non sei sicuro, rigenera **SMTP login** e **SMTP key** in Brevo e aggiorna **Username** e **Password** in Supabase.

## Mittente (From) e dominio

- L’indirizzo **Sender email** in Supabase deve essere un **sender verificato** in Brevo (Brevo → **Senders & IP** → mittente verificato, anche con codice a 6 cifre).
- Il **dominio** del mittente dovrebbe avere **DKIM** (e se possibile SPF/DMARC) configurati in Brevo per una migliore deliverability.

## Conferma email attiva

- **Authentication** → **Providers** → **Email**: verifica che **Confirm email** sia abilitato se vuoi che alla signup venga inviata l’email di conferma.
- Se "Confirm email" è disabilitato, Supabase non manda nessuna email alla registrazione (comportamento voluto in alcuni setup).

## Rate limit e autorizzazioni

- Con SMTP custom, Supabase ha un rate limit predefinito (es. 30 email/ora); puoi modificarlo in **Auth** → **Rate Limits** se serve.
- Se **non** usi SMTP custom, Supabase invia solo a indirizzi “autorizzati” (membri del team). Con Brevo configurato correttamente, le email vanno a tutti gli indirizzi.

## Verifica lato Brevo

- **Transactional** → **Statistics** / **Logs**: [app-smtp.brevo.com](https://app-smtp.brevo.com) per vedere se le email sono uscite e il loro stato.
- Se non compaiono richieste da Supabase, il problema è connessione/credenziali (host, porta, user, **SMTP key**).
- Se compaiono come inviate ma non arrivano, controlla spam, mittente verificato e dominio (DKIM/SPF).

## Recupero password (reset)

Per il flusso “Password dimenticata” l’email di reset inviata da Supabase deve puntare alla tua app. In **Authentication** → **URL Configuration** → **Redirect URLs** aggiungi:

- In sviluppo: `http://localhost:3000/login/reset-password` (o la porta che usi)
- In produzione: `https://tuodominio.com/login/reset-password`

Se l’URL di redirect non è in lista, il link nell’email di reset non funzionerà dopo il click.

## Riepilogo checklist

| Cosa | Dove | Valore / azione |
|------|------|------------------|
| Host SMTP | Supabase SMTP | `smtp-relay.brevo.com` |
| Porta | Supabase SMTP | `587` (o 465 / 2525) |
| Username | Supabase SMTP | SMTP login da Brevo (pagina SMTP) |
| Password | Supabase SMTP | **SMTP key** da Brevo (non API key) |
| Sender email | Supabase SMTP | Email di un sender **verificato** in Brevo |
| Confirm email | Supabase Auth → Email | Abilitato per inviare email alla signup |

Dopo ogni modifica alle credenziali in Supabase, prova una nuova registrazione e controlla i log in Brevo.
