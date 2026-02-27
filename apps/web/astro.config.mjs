// @ts-check
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
    site: "https://YOUR_DOMAIN",
    output: "server",
    adapter: cloudflare({
        remoteBindings: false,
    }),
    prefetch: {
        prefetchAll: true,
        defaultStrategy: "viewport",
    },
    vite: {
        plugins: [tailwindcss()],
    },
});
