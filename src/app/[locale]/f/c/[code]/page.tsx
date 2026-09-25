import FidelityClaim from '@/components/fidelity/FidelityClaim'

// Pagina aperta dal telefono del cliente quando inquadra il QR usa e getta
// della cassa. Il timbro si applica dal client (server action al mount) e
// non nel render: così anteprime link o prefetch non consumano il QR.
export default async function FidelityClaimPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <FidelityClaim code={code} />
}
