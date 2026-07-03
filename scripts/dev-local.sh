#!/bin/sh
# Run a livery task against the LOCAL core checkout (../core).
#
# Why this exists: livery develops against the live core repo, not the
# published JSR package. @deno/vite-plugin reads only the auto-discovered
# deno.json in cwd (it shells out to `deno info` without --config, and
# DENO_CONFIG_PATH is not honored), so local core must be in deno.json
# during the task. This script generates a local config, swaps it in,
# runs the underlying command, and restores the published config on exit.
#
# Requirement: ../core must be cloned (sibling repo). It always is in the
# black-atom-industries org checkout.
#
# Invoked by deno task dev / check / test (see deno.json), which pass the
# private _-prefixed task name. The script resolves that task's underlying
# command and runs it directly (not via `deno task`), so there's no recursion.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f ../core/src/mod.ts ]; then
    echo "✗ ../core not found. Clone black-atom-industries/core alongside livery." >&2
    exit 1
fi

# Crash recovery: if a previous run was SIGKILLed, restore first.
if [ -f deno.json.bak ]; then
    echo "→ restoring deno.json from previous interrupted run..."
    mv deno.json.bak deno.json
fi

# Resolve the underlying command for the requested private task from the
# PUBLISHED config (before swapping). Private tasks are _-prefixed and hold
# the direct commands; public tasks route through this script.
TASK="${1:-_dev}"
CMD=$(python3 -c "
import json
d = json.load(open('deno.json'))
print(d['tasks']['$TASK'])
")
shift || true

# Auto-sync culori version from core so the transitive dep never drifts.
CULORI=$(python3 -c "import json; print(json.load(open('../core/deno.json'))['imports']['culori'])")

# Generate local config: published deno.json + local core + culori.
python3 -c "
import json, sys
d = json.load(open('deno.json'))
d['imports']['@black-atom/core'] = '../core/src/mod.ts'
d['imports']['culori'] = '$CULORI'
json.dump(d, sys.stdout, indent=4); sys.stdout.write('\n')
" > deno.local.json

# Swap in the local config.
cp deno.json deno.json.bak
cp deno.local.json deno.json

restore() {
    if [ -f deno.json.bak ]; then
        mv deno.json.bak deno.json
    fi
    rm -f deno.local.json
}
trap restore EXIT INT TERM

echo "→ running '$CMD' against LOCAL core (../core)"
sh -c "$CMD" "$@"
