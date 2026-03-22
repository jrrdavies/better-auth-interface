import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@/registry", replacement: path.resolve(__dirname, "../../registry") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
})
