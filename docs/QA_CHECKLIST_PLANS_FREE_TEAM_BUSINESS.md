# QA Checklist Manuale - Piani Free, Team, Business

Checklist operativa per testare i comportamenti di prodotto, CI Validate e Judge sui piani `free`, `team`, `business`.

## Setup comune

- [ ] Hai 3 account test separati: uno `free`, uno `team`, uno `business`.
- [ ] Ogni account ha almeno 1 workspace e token CI generato (`Dashboard > Workspace > CI Token`).
- [ ] Hai almeno 2 decisioni per workspace: una `approved`, una `proposed`.
- [ ] Hai una decisione con PR linkata e una senza PR linkata.
- [ ] CLI `decern-gate` pronta o `curl` pronto per:
  - `GET /api/decision-gate/validate`
  - `POST /api/decision-gate/judge`
- [ ] Per i test fallback, `OPEN_AI_API_KEY` e' valorizzata nell'ambiente server.

## Piano Free

### Limiti prodotto

- [ ] **Given** utente Free con 1 workspace, **When** prova a creare un secondo workspace, **Then** creazione rifiutata (upgrade richiesto).
- [ ] **Given** utente Free vicino al limite progetti, **When** crea oltre limite, **Then** azione bloccata.
- [ ] **Given** utente Free vicino al limite utenti/workspace, **When** invita oltre limite, **Then** invito bloccato.

### Validate (observation)

- [ ] **Given** decisione `proposed`, **When** chiami validate senza parametri speciali, **Then** `200`, `valid:true`, `observation:true`.
- [ ] **Given** decisione `approved`, **When** chiami validate, **Then** `200`, `observation:true`.
- [ ] **Given** token CI non valido, **When** chiami validate, **Then** `401 unauthorized`.

### Judge (sempre advisory su Free)

- [ ] **Given** BYO LLM configurato, **When** judge ritorna `allowed:false`, **Then** risposta advisory (la pipeline non deve bloccare).
- [ ] **Given** BYO assente e `OPEN_AI_API_KEY` presente, **When** chiami judge, **Then** usa fallback server.
- [ ] **Given** BYO assente e key server assente, **When** chiami judge, **Then** `allowed:false` con errore configurazione.

## Piano Team (49 EUR/mese)

### Limiti prodotto

- [ ] **Given** Team con 1 workspace, **When** crea secondo workspace, **Then** bloccato.
- [ ] **Given** Team, **When** crea molti progetti, **Then** consentito (illimitati).
- [ ] **Given** Team al limite membri/workspace, **When** invita oltre limite, **Then** bloccato.

### Validate (high impact)

- [ ] **Given** decisione non approvata, **When** validate con `highImpact=false`, **Then** `200 observation:true`.
- [ ] **Given** decisione non approvata, **When** validate con `highImpact=true`, **Then** `422 not_approved`.
- [ ] **Given** decisione approvata, **When** validate con `highImpact=true`, **Then** `200 observation:false`, `status:"approved"`.

### Judge Team

- [ ] **Given** `judge_blocking=true`, **When** judge ritorna `allowed:false`, **Then** la CI puo' bloccare.
- [ ] **Given** `judge_blocking=false`, **When** judge ritorna `allowed:false`, **Then** advisory only.
- [ ] **Given** `judge_tolerance_percent=90`, **When** score judge e' 85, **Then** `allowed:false`.
- [ ] **Given** billing non configurato (`stripe_customer_id` assente), **When** chiami judge, **Then** `allowed:false` con errore billing.

### Fair-use fallback Team (owner/mese, globale)

- [ ] **Given** BYO assente e fallback server attivo, **When** consumo owner mese < 20 EUR, **Then** judge procede.
- [ ] **Given** BYO assente e consumo owner mese >= 20 EUR su qualunque workspace dell'owner, **When** chiami judge, **Then** `allowed:false`, `advisory:true`, no chiamata LLM.

## Piano Business (99 EUR/mese)

### Limiti prodotto

- [ ] **Given** Business, **When** crea piu' workspace, **Then** consentito (illimitati).
- [ ] **Given** Business, **When** crea progetti multipli, **Then** consentito.
- [ ] **Given** Business vicino al limite utenti/workspace, **When** invita oltre soglia, **Then** bloccato.

### Validate con policy Business

- [ ] **Given** `high_impact=false` e `requireApproved=false`, **When** validate su decisione non approvata, **Then** `200 observation:true`.
- [ ] **Given** `requireApproved=true` con decisione non approvata, **When** validate, **Then** `422 not_approved` (indipendentemente da high_impact).
- [ ] **Given** `requireLinkedPR=true` con decisione senza PR linkata, **When** validate, **Then** `422 linked_pr_required` (indipendentemente da high_impact).
- [ ] **Given** `high_impact=true` e policy soddisfatte, **When** validate, **Then** `200 observation:false`.

### Judge Business

- [ ] **Given** `judge_blocking=true`, **When** `allowed:false`, **Then** CI puo' bloccare.
- [ ] **Given** `judge_blocking=false`, **When** `allowed:false`, **Then** advisory only.
- [ ] **Given** tolleranza custom (es. 95), **When** score e' 90, **Then** `allowed:false`.

### Fair-use fallback Business (owner/mese, globale)

- [ ] **Given** BYO assente e consumo owner mese < 35 EUR, **When** chiami judge, **Then** judge procede.
- [ ] **Given** BYO assente e consumo owner mese >= 35 EUR sommando tutti i workspace owner, **When** chiami judge, **Then** `allowed:false`, `advisory:true`, fallback bloccato.

## Error handling trasversale

- [ ] Validate con `decisionId` invalido -> `422 invalid_input`.
- [ ] Validate con decisione inesistente -> `404 not_found`.
- [ ] Judge con body invalido -> `allowed:false`.
- [ ] Judge con timeout/provider down -> `allowed:false` fail-closed.
- [ ] Judge oltre rate limit workspace/owner -> `allowed:false` con reason rate limit.

## Smoke test finale release

- [ ] Free: validate in observation e judge advisory verificati.
- [ ] Team: `highImpact=true` blocca solo non approved.
- [ ] Business: `high_impact/requireApproved/requireLinkedPR` rispettati.
- [ ] Fair-use fallback: cap owner mensile rispettato (20/35) su piu' workspace.
- [ ] BYO LLM continua a funzionare anche dopo cap fallback raggiunto.
