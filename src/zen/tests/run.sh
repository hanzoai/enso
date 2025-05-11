#!/bin/bash

set -e

# make sure we are on root
if [ ! -f "package.json" ]; then
  echo "Please run this script from the root of the project"
  exit 1
fi

path="$1"
other_args=""
for arg in "$@"; do
  if [ "$arg" != "$path" ]; then
    other_args="$other_args $arg"
  fi
done
cd ./engine
if [ "$path" = "all" ] || [ "$path" = "" ]; then
  all_tests=$(find zen/tests -type d)
  all_paths=""
  for test in $all_tests; do
    all_paths="$all_paths zen/tests/$(basename $test)"
  done
  ./mach mochitest $other_args $all_paths
else
  ./mach mochitest $other_args zen/tests/$path
fi
cd ..
