import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    open: true // 서버가 켜지면 브라우저를 자동으로 열어주는 옵션
  }
})
