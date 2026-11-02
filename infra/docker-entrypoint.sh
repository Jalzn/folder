#!/bin/sh
set -eu

# Refuse Railway's ephemeral filesystem when the persistent volume is missing or misplaced.
if [ -n "${RAILWAY_ENVIRONMENT_ID:-}" ] && [ "${RAILWAY_VOLUME_MOUNT_PATH:-}" != /data ]; then
  printf '%s\n' 'Railway precisa de um volume persistente montado em /data.' >&2
  exit 1
fi

# Railway mounts volumes as root. Prepare their ownership before dropping privileges.
if [ "$(id -u)" = 0 ]; then
  chown -R node:node /data /backups
  exec gosu node "$@"
fi

exec "$@"
