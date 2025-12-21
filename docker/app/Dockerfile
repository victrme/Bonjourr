FROM denoland/deno:2.6.3 AS builder

WORKDIR /app
COPY . .
RUN deno install
RUN deno task build

FROM denoland/deno:2.6.3

EXPOSE 8000
WORKDIR /app
COPY --from=builder /app .

CMD ["deno", "task", "serve"]
