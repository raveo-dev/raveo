// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
    output: "server",
    adapter: cloudflare({
        remoteBindings: false,
    }),
    vite: {
        plugins: [tailwindcss()],
    },
});
