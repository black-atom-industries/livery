#!/usr/bin/env bash
set -e

echo "Running backend checks..."
cd src-tauri
cargo fmt -- --check
cargo clippy -- -D warnings
cargo test
