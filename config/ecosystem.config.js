module.exports = {
  apps: [
    {
      name: 'greenroute',
      script: 'server-production.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'backups'
      ],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true
    }
  ]
};
