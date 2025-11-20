import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  base: './',
  optimizeDeps: {
    include: ['ethers'],
    exclude: ['@ethersproject/contracts'],
  },
  resolve: {
    alias: {
      // Ensure ethers resolves correctly
      'ethers': 'ethers',
    },
  },
})

