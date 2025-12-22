#!/bin/sh

version="0.0.0"

deno task build

# Archives builds with the correct name

for folder in /release/*/; do
    [ -d "$folder" ] || continue
    
    name=$(basename "$folder")
    archive_name="bonjourr-${name}-${version}.tar.gz"
    
    echo "Archiving $name..."
    tar -czf "/release/$archive_name" -C "$folder" .
done