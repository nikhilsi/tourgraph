module.exports = {
  apps: [
    {
      name: "tourgraph",
      cwd: "/opt/app",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork", // NOT cluster — SQLite WAL allows 1 writer only

      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,

      // Memory limit — restart if >800MB (droplet has 1GB)
      max_memory_restart: "800M",

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/app/logs/pm2-error.log",
      out_file: "/opt/app/logs/pm2-out.log",
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Watch (disabled in production)
      watch: false,
    },
  ],
};
