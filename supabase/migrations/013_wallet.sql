-- ============================================================================
-- Migration 013: Player Wallet — Persistent Cross-Trip Balance
-- ============================================================================

-- Tracks balances between pairs of players across all trips.
-- player_a_id < player_b_id (enforced). Balance from A's perspective.
-- Positive balance = B owes A. Negative = A owes B.

CREATE TABLE IF NOT EXISTS player_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_b_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  balance numeric(10,2) NOT NULL DEFAULT 0,
  last_trip_id uuid REFERENCES trips(id),
  last_updated timestamptz DEFAULT now(),
  UNIQUE (player_a_id, player_b_id),
  CHECK (player_a_id < player_b_id)
);

CREATE INDEX IF NOT EXISTS idx_wallet_player_a ON player_wallets(player_a_id);
CREATE INDEX IF NOT EXISTS idx_wallet_player_b ON player_wallets(player_b_id);

-- Transaction log for audit trail
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES player_wallets(id) ON DELETE CASCADE,
  source_type text NOT NULL
    CHECK (source_type IN ('trip_settlement', 'manual_payment', 'adjustment')),
  source_trip_id uuid REFERENCES trips(id),
  source_description text,
  amount numeric(10,2) NOT NULL,
  balance_after numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);

-- RLS
ALTER TABLE player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read wallets" ON player_wallets FOR SELECT USING (true);
CREATE POLICY "Authenticated write wallets" ON player_wallets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read wallet_tx" ON wallet_transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated write wallet_tx" ON wallet_transactions
  FOR ALL USING (auth.role() = 'authenticated');
