FROM denoland/deno:alpine-2.8.1 AS builder

WORKDIR /app

COPY _locales _locales
COPY docker docker
COPY src src
COPY tasks tasks
COPY deno.json .
COPY deno.lock .

RUN deno install --frozen
RUN deno task build

FROM denoland/deno:alpine-2.8.1

EXPOSE 8000
WORKDIR /app
COPY --from=builder /app .

CMD ["deno", "task", "serve"]
