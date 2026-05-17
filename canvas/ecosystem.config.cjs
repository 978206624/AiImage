module.exports = {
  apps: [
    {
      name: "canvas",
      script: ".next/standalone/server.js",
      cwd: "/www/wwwroot/canvas",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        HOSTNAME: "127.0.0.1"
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M"
    }
  ]
};
