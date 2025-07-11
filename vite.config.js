import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/nc-flood-response-2025/", // REQUIRED for GitHub Pages unless you're using a custom domain
});
