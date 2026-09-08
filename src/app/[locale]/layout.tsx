import MaintenanceGate from '@/components/MaintenanceGate'

// Questo layout applica SOLO il MaintenanceGate ai children del locale
// I tag <html> e <body> sono gestiti dal layout root (src/app/layout.tsx)
// I meta PWA (manifest, icone, theme-color) sono gestiti dal metadata del layout root
export default function LocaleLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <MaintenanceGate>{children}</MaintenanceGate>
}