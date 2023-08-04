
// vite.config.js
export default {
    build: {
        outDir: 'build',
        emptyOutDir: false,
        lib: {
            entry: 'build/mqtt.js',
            name: 'mqtt',
        },
        rollupOptions: {
           
        },
    },
};