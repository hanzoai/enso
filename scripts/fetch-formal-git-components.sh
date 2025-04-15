#!/bin/bash

set -e

COMPONENT_ROOT=$(pwd)/src/zen

echo "" > .formal-git/components

# iterate top directories and adding the base name to .formal-git/components
for dir in $(find $COMPONENT_ROOT -maxdepth 1 -type d | grep -v '\.git' | grep -v 'node_modules' | grep -v 'engine'); do
  if [ "$dir" != "$COMPONENT_ROOT" ]; then
    echo "$(basename $dir)" >> .formal-git/components
  fi
done

# remove all empty lines
sed -i '/^$/d' .formal-git/components
