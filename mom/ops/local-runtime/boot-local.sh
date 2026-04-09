#!/bin/bash
# Boot local runtime stack using PHP built-in server
# Usage: bash ops/local-runtime/boot-local.sh
# Stop:  bash ops/local-runtime/boot-local.sh stop

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORTAL_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PID_FILE="$SCRIPT_DIR/.php-server.pid"
LOG_FILE="$SCRIPT_DIR/.php-server.log"
ROUTER_FILE="$SCRIPT_DIR/router.php"
PORT=${QMS_LOCAL_PORT:-8080}

case "${1:-start}" in
  start)
    echo "=== Booting QMS Portal local stack ==="
    echo "Portal: $PORTAL_DIR"
    echo "Port: $PORT"

    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Server already running with PID $(cat "$PID_FILE")"
      exit 0
    fi

    # Start PHP built-in server
    cd "$PORTAL_DIR" || exit 1
    nohup php -S "0.0.0.0:$PORT" -t "$PORTAL_DIR" "$ROUTER_FILE" > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "PHP server PID: $(cat "$PID_FILE")"
    echo "PHP server log: $LOG_FILE"

    # Wait for server to be ready
    for i in $(seq 1 10); do
      if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/auth/status" 2>/dev/null | grep -q "200\|401"; then
        echo "Server ready at http://localhost:$PORT"
        break
      fi
      sleep 1
    done

    if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/auth/status" 2>/dev/null | grep -q "200\|401"; then
      echo "[ERROR] Local PHP server did not become ready."
      if [ -f "$LOG_FILE" ]; then
        tail -n 40 "$LOG_FILE"
      fi
      exit 1
    fi

    echo "=== Local stack booted ==="
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null
      rm "$PID_FILE"
      echo "Server stopped."
    else
      echo "No PID file found."
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop}"
    exit 1
    ;;
esac
