#!/bin/bash

# make sure we are on root
if [ ! -f "package.json" ]; then
  echo "Please run this script from the root of the project"
  exit 1
fi

#npm run build:ui

cd ./engine
./mach mochitest zen/tests/ $@
cd ..
