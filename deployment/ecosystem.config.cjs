module.exports = {
  apps: [
    {
      name: "tourgraph-web",
      cwd: "/opt/app/web",
      script: "node_modules/.bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },

      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,

      // Memory limit — restart if >500MB (share 1GB droplet with API)
      max_memory_restart: "500M",

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/app/logs/web-error.log",
      out_file: "/opt/app/logs/web-out.log",
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,

      watch: false,
    },
    {
      name: "tourgraph-api",
      cwd: "/opt/app/backend",
      script: "dist/index.js",
      instances: 1,
      exec_mode: "fork",

      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DATABASE_PATH: "/opt/app/data/tourgraph.db",
      },

      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,

      // Memory limit — API is lightweight, SQLite read-only
      max_memory_restart: "300M",

      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/app/logs/api-error.log",
      out_file: "/opt/app/logs/api-out.log",
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,

      watch: false,
    },
  ],
};
