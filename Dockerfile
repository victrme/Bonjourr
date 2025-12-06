FROM denoland/deno:alpine AS builder

WORKDIR /app
COPY . .
RUN deno install
RUN deno task online:prod

FROM denoland/deno:alpine

EXPOSE 8080
WORKDIR /app
COPY --from=builder /app/release/online /app

CMD ["deno", "run", "--allow-net", "--allow-read", "jsr:@std/http/file-server", "--port", "8080"]
