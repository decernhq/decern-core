-- Estendi enum plan_id con ultra e enterprise.
-- Deve essere in una migration separata: in PostgreSQL non si può usare
-- un valore enum appena aggiunto nella stessa transazione.
alter type plan_id add value if not exists 'ultra';
alter type plan_id add value if not exists 'enterprise';
