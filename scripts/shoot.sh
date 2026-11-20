#!/bin/bash
# Screenshot harness: shoots each scene with headless Chrome, retries blank frames.
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT="${PORT:-8139}"
SEED="${SEED:-7}"
OUT="${OUT:-/tmp/shots}"
mkdir -p "$OUT"
NAMES="play drive action start"
q_for() {
  case "$1" in
    play) echo "?shot=play&seed=$SEED" ;;
    drive) echo "?shot=drive&seed=$SEED" ;;
    action) echo "?shot=action&seed=$SEED" ;;
    start) echo "?shot=start&seed=$SEED" ;;
  esac
}
for name in $NAMES; do
  q="$(q_for "$name")"
  ok=0
  for attempt in 1 2 3 4 5; do
    prof="/tmp/chrome-prof-$$-$name-$attempt"
    budget=$((8000 + attempt * 4000))
    "$CHROME" --headless=new --disable-gpu --force-color-profile=srgb \
      --run-all-compositor-stages-before-draw --hide-scrollbars \
      --user-data-dir="$prof" --window-size=1280,800 \
      --screenshot="$OUT/$name.png" --virtual-time-budget=$budget "http://localhost:$PORT/$q" > /dev/null 2>&1
    rm -rf "$prof"
    size=$(stat -f%z "$OUT/$name.png" 2>/dev/null || echo 0)
    if [ "$size" -gt 20000 ]; then
      echo "$name: ok ($size bytes, attempt $attempt, budget $budget)"
      ok=1
      break
    fi
    echo "$name: blank ($size bytes), retrying"
  done
  [ "$ok" = "0" ] && echo "$name: FAILED"
done
