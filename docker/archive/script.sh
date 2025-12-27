#!/bin/sh

version="22.0.1"

deno task build

# Archives builds with the correct name

for folder in /release/*/; do
    [ -d "$folder" ] || continue

    name=$(basename "$folder")
    archive_name="bonjourr-${name}-${version}.zip"

    echo "Archiving $name..."

    (cd "$folder" && zip -r "/release/$name/$archive_name" *)
done
