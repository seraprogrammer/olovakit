import { defineConfig } from "vite";
import olovakitPlugin from "olovakitplugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [olovakitPlugin(), tailwindcss()],
});
