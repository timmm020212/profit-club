module.exports = {
  apps: [
    {
      name: "nextjs",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOSTNAME: "0.0.0.0",
      },
    },
    {
      name: "bot-client",
      script: "node_modules/.bin/tsx",
      args: "telegram-bot/client-simple.ts",
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "bot-masters",
      script: "node_modules/.bin/tsx",
      args: "telegram-bot/masters-bot-full.ts",
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
