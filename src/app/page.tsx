import { redirect } from 'next/navigation'

// ✅ Redirect automatico da "/" a "/it"
export default function RootPage() {
  redirect('/it')
}