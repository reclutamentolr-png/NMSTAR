import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // Qui puoi mantenere le tue configurazioni esistenti
  // (es. images, experimental, ecc.)
};

export default withNextIntl(nextConfig);