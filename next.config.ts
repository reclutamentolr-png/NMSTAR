import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.133', 'localhost'],
};

export default withNextIntl(nextConfig);
