-- ============================================================
-- BIP — número do carregamento no pedido
-- Cruza o pedido/carregamento do BIP com o app "Registro de Carregamento"
-- (schema expedicao). Campo opcional, texto livre.
-- Rodar no SQL Editor do Supabase Studio do SMERP (schema 'bip'). Idempotente.
-- ============================================================
alter table bip.loading_orders add column if not exists loading_number text;

-- Recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';
