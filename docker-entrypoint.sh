#!/bin/sh
set -e

# Support PUID and PGID for homelab / NAS permission synchronization
PUID=${PUID:-1000}
PGID=${PGID:-1000}

# Update node user UID and GID if running as root in container
if [ "$(id -u)" = "0" ]; then
    if [ "$PGID" != "1000" ]; then
        groupmod -o -g "$PGID" node 2>/dev/null || true
    fi
    if [ "$PUID" != "1000" ]; then
        usermod -o -u "$PUID" -g "$PGID" node 2>/dev/null || true
    fi

    # Target directory to check and fix permissions
    TARGET_CONFIG="${CONFIG_DIR:-/config}"
    
    mkdir -p "$TARGET_CONFIG" /app/data
    
    # Fix ownership and write permissions on mounted volume
    chown -R "$PUID:$PGID" "$TARGET_CONFIG" /app 2>/dev/null || true
    chmod -R 775 "$TARGET_CONFIG" 2>/dev/null || true

    # Execute Node server as non-root user
    exec su-exec "$PUID:$PGID" "$@"
else
    # Container is already running as non-root
    exec "$@"
fi
