#!/bin/bash

set -e

# make sure we are on root
if [ ! -f "package.json" ]; then
  echo "Please run this script from the root of the project"
  exit 1
fi

cd ./engine
./mach mochitest $@ \
  zen/tests/workspaces \
  zen/tests/container_essentials \
  zen/tests/urlbar \
  zen/tests/pinned \
  zen/tests/compact_mode
cd ..
