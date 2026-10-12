#!/bin/sh
#
# Puts the built web extension inside the extension bundle.
#
# Xcode copies declared resources by folder, which would nest the extension one
# level too deep — Safari looks for manifest.json at the root of the bundle's
# Resources. So the built extension is copied in here instead, before the product
# is signed. Run `bun run build` in the repository root first.
set -eu

source_dir="$SRCROOT/../build/preview"
destination="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"

if [ ! -f "$source_dir/manifest.json" ]; then
	echo "error: $source_dir/manifest.json is missing. Run 'bun run build' in the repository root, then build again." 1>&2
	exit 1
fi

echo "Copying the web extension into $destination"
mkdir -p "$destination"
rsync --archive --delete "$source_dir/" "$destination/"
