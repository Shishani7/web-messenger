import tailwindcss from "@tailwindcss/vite"

export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    css: ['./app/sharded/assets/css/main.css'],
    vite: {
        plugins: [
            tailwindcss(),
        ],
    },
    devServer: {
        host: "0.0.0.0"
    },
    runtimeConfig: {
        public: {
            apiBase: 'https://localhost:3001'
        }
    },
    // app: {
    //     head: {
    //         link: [
    //             { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
    //         ]
    //     }
    // }
});