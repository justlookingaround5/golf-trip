'use client'

import { useState, useEffect } from 'react'
import type { PlayerBalance, PaymentInstruction } from '@/lib/settlement'

interface SettlementClientProps {
  tripId: string
  tripName: string
  balances: PlayerBalance[]
  payments: PaymentInstruction[]
  expenses: {
    id: string
    description: string
    category: string
    amount: number
    paid_by: { id: string; player: { name: string } | { name: string }[] } | null
    created_at: string
  }[]
  tripPlayers: { id: string; name: string; player_id?: string }[]
  currentPlayerId?: string | null
}

export default function SettlementClient({
  tripId,
  tripName,
  balances,
  payments,
  expenses,
  tripPlayers,
  currentPlayerId = null,
}: SettlementClientProps) {
  const [activeTab, setActiveTab] = useState<'payments' | 'balances' | 'expenses' | 'wallet'>('payments')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-900 text-white">
        <div className="mx-auto max-w-lg px-4 py-6">
          <p className="text-green-200 text-sm">{tripName}</p>
          <h1 className="text-2xl font-bold">The Bank</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-lg flex">
          {(['payments', 'balances', 'expenses', 'wallet'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? 'border-b-2 border-green-700 text-green-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">

        {/* Payments — Who Pays Whom */}
        {activeTab === 'payments' && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">All settled up!</p>
            ) : (
              payments.map((p, i) => (
                <div key={i} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900">{p.from_player}</span>
                      <span className="text-gray-400 mx-2">&rarr;</span>
                      <span className="font-semibold text-green-700">{p.to_player}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ${p.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {p.venmo_url && (
                      <a href={p.venmo_url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 rounded-md bg-blue-600 py-2 text-center text-xs font-medium text-white hover:bg-blue-700">
                        Venmo
                      </a>
                    )}
                    {p.cashapp_url && (
                      <a href={p.cashapp_url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 rounded-md bg-green-600 py-2 text-center text-xs font-medium text-white hover:bg-green-700">
                        Cash App
                      </a>
                    )}
                    {p.zelle_url && (
                      <a href={p.zelle_url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 rounded-md bg-purple-600 py-2 text-center text-xs font-medium text-white hover:bg-purple-700">
                        Zelle
                      </a>
                    )}
                    {!p.venmo_url && !p.cashapp_url && !p.zelle_url && (
                      <span className="text-xs text-gray-400">No payment links configured</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Balances */}
        {activeTab === 'balances' && (
          <div className="space-y-2">
            {balances.map(b => (
              <div key={b.trip_player_id} className="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{b.player_name}</span>
                  <span className={`text-lg font-bold ${
                    b.total > 0 ? 'text-green-700' : b.total < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {b.total > 0 ? '+' : ''}${b.total.toFixed(2)}
                  </span>
                </div>
                {b.breakdown.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {b.breakdown.map((entry, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-500">
                        <span>{entry.source}</span>
                        <span className={entry.amount >= 0 ? 'text-green-600' : 'text-red-500'}>
                          {entry.amount > 0 ? '+' : ''}${entry.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {balances.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">No transactions yet.</p>
            )}
          </div>
        )}

        {/* Expenses */}
        {activeTab === 'expenses' && (
          <div className="space-y-3">
            <AddExpenseForm tripId={tripId} tripPlayers={tripPlayers} />
            {expenses.map((exp) => {
              const payer = exp.paid_by
                ? Array.isArray(exp.paid_by.player)
                  ? exp.paid_by.player[0]
                  : exp.paid_by.player
                : null
              return (
                <div key={exp.id} className="rounded-lg bg-white border border-gray-200 p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{exp.description}</p>
                      <p className="text-xs text-gray-500">
                        Paid by {(payer as { name: string } | null)?.name || 'Unknown'} &middot; {exp.category}
                      </p>
                    </div>
                    <span className="font-bold text-gray-900">${exp.amount}</span>
                  </div>
                </div>
              )
            })}
            {expenses.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">No expenses recorded yet.</p>
            )}
          </div>
        )}

        {/* Wallet */}
        {activeTab === 'wallet' && (
          <WalletTab tripId={tripId} currentPlayerId={currentPlayerId} />
        )}
      </div>
    </div>
  )
}

interface WalletBalance {
  other_player_id: string
  other_player_name: string
  balance: number
  wallet_id: string
}

interface WalletData {
  balances: WalletBalance[]
  totalOwed: number
  totalOwing: number
}

function WalletTab({ tripId, currentPlayerId }: { tripId: string; currentPlayerId: string | null }) {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPayForm, setShowPayForm] = useState(false)
  const [payTarget, setPayTarget] = useState<WalletBalance | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    if (!currentPlayerId) { setLoading(false); return }
    fetch(`/api/wallet?playerId=${currentPlayerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setWalletData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [currentPlayerId])

  async function handlePay() {
    if (!payTarget || !payAmount || !currentPlayerId) return
    setPaying(true)
    try {
      await fetch('/api/wallet/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_player_id: currentPlayerId,
          to_player_id: payTarget.other_player_id,
          amount: parseFloat(payAmount),
          note: 'Paid via Golf Trip app',
        }),
      })
      setShowPayForm(false)
      setPayAmount('')
      const res = await fetch(`/api/wallet?playerId=${currentPlayerId}`)
      if (res.ok) setWalletData(await res.json())
    } catch {
      // ignore
    } finally {
      setPaying(false)
    }
  }

  async function handleFinalize() {
    setFinalizing(true)
    try {
      await fetch(`/api/trips/${tripId}/settlement`, { method: 'POST' })
      if (currentPlayerId) {
        const res = await fetch(`/api/wallet?playerId=${currentPlayerId}`)
        if (res.ok) setWalletData(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setFinalizing(false)
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-500">Loading wallet...</div>
  if (!currentPlayerId) return <div className="text-center py-8 text-gray-500">Sign in to see your wallet</div>

  const owing = walletData?.balances?.filter(b => b.balance < 0) || []
  const owed = walletData?.balances?.filter(b => b.balance > 0) || []

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
          <p className="text-xs text-green-700">Owed to you</p>
          <p className="text-xl font-bold text-green-700">${walletData?.totalOwed?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center">
          <p className="text-xs text-red-600">You owe</p>
          <p className="text-xl font-bold text-red-600">${walletData?.totalOwing?.toFixed(2) || '0.00'}</p>
        </div>
      </div>

      {/* Finalize trip button */}
      <button
        onClick={handleFinalize}
        disabled={finalizing}
        className="w-full rounded-md bg-green-700 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {finalizing ? 'Finalizing...' : 'Finalize Trip → Push to Wallet'}
      </button>

      {/* People who owe you */}
      {owed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">OWED TO YOU</p>
          {owed.map(b => (
            <div key={b.wallet_id} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-900">{b.other_player_name}</span>
              <span className="font-bold text-green-700">${b.balance.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* People you owe */}
      {owing.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">YOU OWE</p>
          {owing.map(b => (
            <div key={b.wallet_id} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-900">{b.other_player_name}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-600">${Math.abs(b.balance).toFixed(2)}</span>
                <button
                  onClick={() => { setPayTarget(b); setPayAmount(Math.abs(b.balance).toFixed(2)); setShowPayForm(true) }}
                  className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white"
                >
                  Paid
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay form */}
      {showPayForm && payTarget && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-2">
          <p className="text-sm font-medium text-gray-900">
            Record payment to {payTarget.other_player_name}
          </p>
          <input
            type="number"
            value={payAmount}
            onChange={e => setPayAmount(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handlePay}
              disabled={paying || !payAmount}
              className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {paying ? 'Recording...' : 'Confirm Payment'}
            </button>
            <button onClick={() => setShowPayForm(false)} className="px-3 py-2 text-sm text-gray-500">Cancel</button>
          </div>
        </div>
      )}

      {owing.length === 0 && owed.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-4">No wallet history yet. Finalize a trip to start tracking.</p>
      )}
    </div>
  )
}

function AddExpenseForm({ tripId, tripPlayers }: { tripId: string; tripPlayers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('other')
  const [paidBy, setPaidBy] = useState(tripPlayers[0]?.id || '')
  const [saving, setSaving] = useState(false)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-green-500 hover:text-green-700">
        + Add Expense
      </button>
    )
  }

  async function handleSubmit() {
    if (!description || !amount || !paidBy) return
    setSaving(true)
    try {
      await fetch(`/api/trips/${tripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount),
          category,
          paid_by_trip_player_id: paidBy,
        }),
      })
      setOpen(false)
      setDescription('')
      setAmount('')
      window.location.reload()
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-3">
      <input
        placeholder="What was it for?"
        value={description}
        onChange={e => setDescription(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="$"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {['lodging', 'food', 'transport', 'golf', 'entertainment', 'other'].map(c =>
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          )}
        </select>
      </div>
      <select
        value={paidBy}
        onChange={e => setPaidBy(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      >
        {tripPlayers.map(tp =>
          <option key={tp.id} value={tp.id}>{tp.name}</option>
        )}
      </select>
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !description || !amount || !paidBy}
          className="flex-1 rounded-md bg-green-700 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? 'Adding...' : 'Add Expense'}
        </button>
        <button onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm text-gray-500">
          Cancel
        </button>
      </div>
    </div>
  )
}
