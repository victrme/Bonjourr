FROM denoland/deno:alpine AS builder

WORKDIR /app
COPY . .
RUN deno install
RUN deno task build

FROM denoland/deno:alpine

EXPOSE 8080
WORKDIR /app
COPY --from=builder /app .

CMD ["deno", "task", "serve"]
