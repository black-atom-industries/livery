#!/usr/bin/env bash
set -e

echo "Running frontend checks..."
deno task check
deno lint
deno fmt
deno task test
