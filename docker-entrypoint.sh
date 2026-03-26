#!/bin/sh
set -e

# ── Runtime checks for Decern Self-Hosted ──

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

error=0

# Required vars
for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
  eval val=\$$var
  if [ -z "$val" ]; then
    printf "${RED}ERROR${NC}: %s is required but not set.\n" "$var"
    error=1
  fi
done

if [ "$error" -eq 1 ]; then
  printf "\nSet the missing variables in your .env file or docker run --env.\n"
  exit 1
fi

# Self-hosted always runs as enterprise (gate is the container registry access)
export NEXT_PUBLIC_SELF_HOSTED=true

printf "${GREEN}INFO${NC}: Starting Decern on port ${PORT:-3000}...\n"

exec "$@"
