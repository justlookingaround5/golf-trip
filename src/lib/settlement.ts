/**
 * Settlement Calculator
 *
 * Aggregates game_results into a "who owes whom" matrix.
 * Generates payment deep links for Venmo, Zelle, CashApp, PayPal.
 */

export interface PlayerBalance {
  trip_player_id: string
  player_name: string
  total: number                 // net balance (positive = receives money)
  breakdown: {
    source: string              // "Skins R1", "Nassau R2", "Birdies", etc.
    amount: number
  }[]
}

export interface PaymentInstruction {
  from_player: string           // name
  from_player_id: string
  to_player: string             // name
  to_player_id: string
  amount: number
  venmo_url: string | null
  zelle_url: string | null
  cashapp_url: string | null
}

/**
 * Calculate net balances from settlement ledger entries.
 */
export function calculateBalances(
  entries: { trip_player_id: string; amount: number; description: string | null }[],
  playerNames: Map<string, string>
): PlayerBalance[] {
  const balanceMap = new Map<string, PlayerBalance>()

  for (const entry of entries) {
    if (!balanceMap.has(entry.trip_player_id)) {
      balanceMap.set(entry.trip_player_id, {
        trip_player_id: entry.trip_player_id,
        player_name: playerNames.get(entry.trip_player_id) || 'Unknown',
        total: 0,
        breakdown: [],
      })
    }
    const balance = balanceMap.get(entry.trip_player_id)!
    balance.total += entry.amount
    balance.breakdown.push({
      source: entry.description || 'Unknown',
      amount: entry.amount,
    })
  }

  return Array.from(balanceMap.values()).sort((a, b) => b.total - a.total)
}

/**
 * Minimize the number of payments needed to settle all debts.
 * Uses a greedy algorithm: biggest creditor gets paid by biggest debtor, repeat.
 */
export function minimizePayments(
  balances: PlayerBalance[]
): PaymentInstruction[] {
  // Separate into creditors (positive) and debtors (negative)
  const creditors = balances
    .filter(b => b.total > 0.005) // ignore sub-penny
    .map(b => ({ ...b, remaining: b.total }))
    .sort((a, b) => b.remaining - a.remaining)

  const debtors = balances
    .filter(b => b.total < -0.005)
    .map(b => ({ ...b, remaining: -b.total })) // make positive for easier math
    .sort((a, b) => b.remaining - a.remaining)

  const payments: PaymentInstruction[] = []
  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]

    const amount = Math.min(creditor.remaining, debtor.remaining)
    if (amount > 0.005) {
      payments.push({
        from_player: debtor.player_name,
        from_player_id: debtor.trip_player_id,
        to_player: creditor.player_name,
        to_player_id: creditor.trip_player_id,
        amount: Math.round(amount * 100) / 100,
        venmo_url: null,  // populated when we have usernames
        zelle_url: null,
        cashapp_url: null,
      })
    }

    creditor.remaining -= amount
    debtor.remaining -= amount

    if (creditor.remaining < 0.005) ci++
    if (debtor.remaining < 0.005) di++
  }

  return payments
}

/**
 * Generate payment deep link URLs.
 * Call this per payment when you have the recipient's payment handles.
 */
export function generatePaymentLinks(
  amount: number,
  recipientName: string,
  handles: {
    venmo?: string     // Venmo username (without @)
    cashapp?: string   // CashApp $cashtag (without $)
    zelle_phone?: string
    zelle_email?: string
  }
): { venmo_url: string | null; zelle_url: string | null; cashapp_url: string | null } {
  const note = encodeURIComponent(`Golf trip settlement`)

  return {
    venmo_url: handles.venmo
      ? `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(handles.venmo)}&amount=${amount}&note=${note}`
      : null,
    cashapp_url: handles.cashapp
      ? `cashapp://cash.app/${handles.cashapp}/${amount}`
      : null,
    zelle_url: handles.zelle_phone || handles.zelle_email
      ? `https://enroll.zellepay.com/qrcode?data=${encodeURIComponent(JSON.stringify({
          token: handles.zelle_phone || handles.zelle_email,
          amount: amount.toString(),
          name: recipientName,
        }))}`
      : null,
  }
}
