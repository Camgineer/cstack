#!/bin/sh
set -eu
self=$0
while [ -L "$self" ]; do
  target=$(readlink "$self")
  case $target in
    /*) self=$target ;;
    *) self=$(dirname -- "$self")/$target ;;
  esac
done
exec node "$(dirname -- "$self")/install.mjs" "$@"
