import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FixedExpenseManager from '@/components/spendly/FixedExpenseManager'
import type { SpendlyFixedExpense } from '@/lib/spendly'

export default async function SpendlyFixedExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: yearParam } = await searchParams
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Mostra le spese fisse ancora "attive" durante l'anno selezionato: sono
  // iniziate entro il 31/12 dell'anno e non sono ancora terminate prima del
  // 1/1 dello stesso anno (end_date nullo = nessuna scadenza).
  const { data: fixedExpenses } = await supabase
    .from('spendly_fixed_expenses')
    .select('id, description, amount, frequency, category, start_date, end_date, billing_day, notes')
    .eq('user_id', user.id)
    .lte('start_date', `${year}-12-31`)
    .or(`end_date.is.null,end_date.gte.${year}-01-01`)
    .order('start_date', { ascending: false })
    .returns<SpendlyFixedExpense[]>()

  return <FixedExpenseManager items={fixedExpenses || []} year={year} />
}
