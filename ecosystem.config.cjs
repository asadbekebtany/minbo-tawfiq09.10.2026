/** @type {import("pm2").StartOptions[]} */
module.exports = {
  apps: [
    {
      name: "tavfiq",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 20,
      min_uptime: "10s",
      exp_backoff_restart_delay: 200,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        APP_ENV: "production",
        NEXT_PUBLIC_APP_ENV: "production",
      },
      out_file: "logs/out.log",
      error_file: "logs/error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
