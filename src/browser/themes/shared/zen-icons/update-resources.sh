# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# note: you need to be in the same directory as the script to run it

if [ $(basename $PWD) != "zen-icons" ]; then
  echo "You need to be in the zen-icons directory to run this script"
  exit 1
fi

echo "# This Source Code Form is subject to the terms of the Mozilla Public" > jar.inc.mn
echo "# License, v. 2.0. If a copy of the MPL was not distributed with this" >> jar.inc.mn
echo "# file, You can obtain one at http://mozilla.org/MPL/2.0/." >> jar.inc.mn
echo "" >> jar.inc.mn

add_header_to_file() {
  # add "#filter dumbComments emptyLines substitution" if it doesnt exist at the top of the file
  HEADER="#filter dumbComments emptyLines substitution"
  file="$1"
  if ! grep -qF "$HEADER" "$file"; then
    echo "$HEADER" | cat - "$file" > temp && mv temp "$file"
  fi
}

merge_svg_paths() {
  # Remove all lines starting with "#" so we can use a valid svg file
  file="$1"
  echo "Merging paths in $file"
  grep -v '^#' "$file" > temp.svg && mv temp.svg "$file"
  # Use inkscape to merge all paths into one
  inkscape "$file" --actions="select-all;object-to-path;select-all;path-combine" --export-plain-svg --export-filename="temp.svg"
  npx svgo --multipass "temp.svg" --config=../../../../../svgo.config.js
  mv temp.svg "$file"
  echo "# This Source Code Form is subject to the terms of the Mozilla Public" > temp
  echo "# License, v. 2.0. If a copy of the MPL was not distributed with this" >> temp
  echo "# file, You can obtain one at http://mozilla.org/MPL/2.0/." >> temp
  cat "$file" >> temp
  mv temp "$file"
}

do_icons() {
  os=$1
  preprocessed_os=$2
  echo "#ifdef XP_$preprocessed_os" >> jar.inc.mn
  for filename in $os/*.svg; do
    # remove the os/ prefix
    merge_svg_paths $filename
    add_header_to_file $filename
    filename=$(basename $filename)
    echo "*  skin/classic/browser/zen-icons/$filename                      (../shared/zen-icons/$os/$filename) " >> jar.inc.mn
  done
  echo "#endif" >> jar.inc.mn
}

do_common_icons() {
  for filename in common/*.svg; do
    # remove the os/ prefix
    merge_svg_paths $filename
    add_header_to_file $filename
    filename=$(basename $filename)
    echo "*  skin/classic/browser/zen-icons/$filename                      (../shared/zen-icons/common/$filename) " >> jar.inc.mn
  done
  for filename in common/selectable/*.svg; do
    # remove the os/ prefix
    merge_svg_paths $filename
    add_header_to_file $filename
    filename=$(basename $filename)
    echo "*  skin/classic/browser/zen-icons/selectable/$filename          (../shared/zen-icons/common/selectable/$filename) " >> jar.inc.mn
  done
}

do_icons lin WIN
do_icons lin MACOSX # TODO: use macos icons
do_icons lin LINUX

do_common_icons

echo "Working on icons.css"
echo "  skin/classic/browser/zen-icons/icons.css                      (../shared/zen-icons/icons.css) " >> jar.inc.mn

echo "Done!"
