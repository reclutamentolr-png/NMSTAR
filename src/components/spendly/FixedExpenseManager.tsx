'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Plus, Repeat, Calculator, CalendarDays, Pencil, Trash2 } from 'lucide-react'
import SpendlyModal from './SpendlyModal'
import KpiCard from './KpiCard'
import YearSelect from './YearSelect'
import { createFixedExpense, updateFixedExpense, deleteFixedExpense } from '@/app/actions/spendly'
import {
  FIXED_EXPENSE_CATEGORIES,
  formatCurrency,
  currentYearOnly,
  fixedExpenseAppliesToMonth,
  type SpendlyFixedExpense,
  type FixedExpenseCategory,
  type FixedExpenseFrequency,
} from '@/lib/spendly'

const CATEGORY_KEY: Record<FixedExpenseCategory, string> = {
  mutuo_affitto: 'categoryMutuoAffitto',
  bollette: 'categoryBollette',
  abbonamenti: 'categoryAbbonamenti',
  assicurazioni: 'categoryAssicurazioni',
  finanziamenti: 'categoryFinanziamenti',
  ricariche: 'categoryRicariche',
  altro: 'categoryAltro',
}

const FREQUENCY_KEY: Record<FixedExpenseFrequency, string> = {
  mensile: 'frequencyMonthly',
  bimestrale: 'frequencyBimonthly',
  trimestrale: 'frequencyQuarterly',
  semestrale: 'frequencySemiannual',
  annuale: 'frequencyAnnual',
}

type FormState = {
  description: string
  amount: string
  frequency: FixedExpenseFrequency
  category: FixedExpenseCategory
  startDate: string
  endDate: string
  billingDay: string
  notes: string
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): FormState {
  return { description: '', amount: '', frequency: 'mensile', category: 'mutuo_affitto', startDate: todayISO(), endDate: '', billingDay: '1', notes: '' }
}

export default function FixedExpenseManager({ items, year }: { items: SpendlyFixedExpense[]; year: number }) {
  const t = useTranslations('spendly')
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SpendlyFixedExpense | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Somma solo le scadenze che ricorrono davvero nell'anno selezionato,
  // mese per mese a partire da start_date (e fino a end_date) — non basta
  // moltiplicare l'importo per il numero di occorrenze "teoriche" della
  // frequenza, altrimenti una spesa iniziata a metà anno verrebbe contata
  // come se fosse attiva fin da gennaio.
  const totalYearly = Array.from({ length: 12 }, (_, i) => i + 1).reduce(
    (sum, month) =>
      sum + items.filter((i) => fixedExpenseAppliesToMonth(i, year, month)).reduce((s, i) => s + i.amount, 0),
    0
  )
  // Media Spesa Fissa Mensile = media semplice degli importi delle spese
  // fisse in scadenza nel mese corrente (non il totale annuo diviso 12):
  // es. due spese da 573 e 300 dovute questo mese danno una media di 436,5.
  const currentMonth = new Date().getMonth() + 1
  const currentMonthItems = items.filter((i) => fixedExpenseAppliesToMonth(i, year, currentMonth))
  const monthlyQuota =
    currentMonthItems.length > 0 ? currentMonthItems.reduce((sum, i) => sum + i.amount, 0) / currentMonthItems.length : 0

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (item: SpendlyFixedExpense) => {
    setEditing(item)
    setForm({
      description: item.description,
      amount: String(item.amount),
      frequency: item.frequency,
      category: item.category,
      startDate: item.start_date,
      endDate: item.end_date || '',
      billingDay: item.billing_day ? String(item.billing_day) : '',
      notes: item.notes || '',
    })
    setError(null)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.description.trim() || Number.isNaN(amount) || amount < 0 || !form.startDate) {
      setError(t('saveError'))
      setSaving(false)
      return
    }
    if (form.endDate && form.endDate < form.startDate) {
      setError(t('saveError'))
      setSaving(false)
      return
    }

    const payload = {
      description: form.description.trim(),
      amount,
      frequency: form.frequency,
      category: form.category,
      startDate: form.startDate,
      endDate: form.endDate || null,
      billingDay: form.billingDay ? parseInt(form.billingDay, 10) : null,
      notes: form.notes,
    }

    const result = editing ? await updateFixedExpense(editing.id, payload) : await createFixedExpense(payload)

    setSaving(false)
    if (!result.success) {
      setError(t(result.message as any))
      return
    }

    setModalOpen(false)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    const result = await deleteFixedExpense(id)
    if (result.success) router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--ink)]">{t('fixedExpensesPageTitle')}</h2>
          <p className="text-sm text-[var(--muted)]">{t('fixedExpensesPageDescription')}</p>
        </div>
        <div className="flex items-center gap-3">
          <YearSelect year={year} years={currentYearOnly()} />
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] text-[var(--ink)] font-bold px-4 py-2 rounded-lg text-sm hover:brightness-105 transition-all"
          >
            <Plus className="w-4 h-4" /> {t('new')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard label={t('totalYearly')} value={formatCurrency(totalYearly)} icon={Repeat} />
        <KpiCard label={t('monthlyQuota')} value={formatCurrency(monthlyQuota)} icon={Calculator} />
        <KpiCard label={t('entryCount')} value={String(items.length)} icon={CalendarDays} />
      </div>

      <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--paper)] overflow-hidden">
        {items.length === 0 ? (
          <p className="text-center text-sm text-[var(--muted)] py-10">{t('noFixedExpensesForYear', { year })}</p>
        ) : (
          <ul className="divide-y divide-[var(--gold)]/10">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ink)]">
                    <Repeat className="h-4 w-4 text-[var(--gold-bright)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ink)] truncate">{item.description}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-0.5 flex-wrap">
                      <span>{t(CATEGORY_KEY[item.category])}</span>
                      <span className="rounded-md border border-[var(--gold)]/30 bg-[var(--background)] px-1.5 py-0 text-[10px] font-semibold text-[var(--ink)]">
                        {t(FREQUENCY_KEY[item.frequency])}
                      </span>
                      <span>
                        {new Date(item.start_date).toLocaleDateString('it-IT')}
                        {item.end_date ? ` → ${new Date(item.end_date).toLocaleDateString('it-IT')}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-red-600">-{formatCurrency(item.amount)}</span>
                  <button type="button" onClick={() => openEdit(item)} className="text-[var(--muted)] hover:text-[var(--ink)]" aria-label={t('edit')}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)} className="text-[var(--muted)] hover:text-red-600" aria-label={t('delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <SpendlyModal title={editing ? t('editFixedExpenseTitle') : t('newFixedExpenseTitle')} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('descriptionField')}</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('amountField')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('frequencyField')}</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as FixedExpenseFrequency })}
                  className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
                >
                  {(Object.keys(FREQUENCY_KEY) as FixedExpenseFrequency[]).map((f) => (
                    <option key={f} value={f}>
                      {t(FREQUENCY_KEY[f])}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('categoryField')}</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as FixedExpenseCategory })}
                className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
              >
                {FIXED_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(CATEGORY_KEY[c])}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('startDateField')}</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('endDateField')}</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
                  placeholder={t('noEndDate')}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('billingDayField')}</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.billingDay}
                onChange={(e) => setForm({ ...form, billingDay: e.target.value })}
                className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1">{t('notesField')}</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('notesPlaceholder')}
                rows={2}
                className="w-full p-2.5 border border-[var(--gold)]/30 rounded-lg focus:ring-2 focus:ring-[var(--gold)] focus:outline-none resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-[var(--background)] hover:bg-[var(--gold)]/10 text-[var(--ink)] rounded-lg font-medium transition-colors">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] text-[var(--ink)] rounded-lg font-bold disabled:opacity-50 transition-all">
                {saving ? '…' : t('save')}
              </button>
            </div>
          </form>
        </SpendlyModal>
      )}
    </div>
  )
}
