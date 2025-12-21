FROM denoland/deno:2.6.3 AS builder

WORKDIR /app

COPY . .
RUN deno install
RUN deno task build

# Archives builds with the correct name

RUN sh <<-'EOF'
  version="0.0.0"
  for folder in ./release/*/; do
    [ -d "$folder" ] || continue
    name=$(basename "$folder")
    echo "Archiving $name..."
    tar -czf "./bonjourr-${name}-${version}.tar.gz" -C "$folder" .
  done
EOF

# Moves archives outside of docker container

CMD sh -c "mkdir -p ./archives && mv *.tar.gz ./archives/"
