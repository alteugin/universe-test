import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@universe-test/contracts'],
};

export default config;
