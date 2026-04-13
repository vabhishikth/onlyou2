import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@onlyou/core', '@onlyou/ui'],
  reactStrictMode: true,
}

export default config
