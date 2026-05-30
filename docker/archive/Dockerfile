FROM denoland/deno:alpine-2.8.1

COPY _locales _locales
COPY docker docker
COPY src src
COPY tasks tasks
COPY deno.json .
COPY deno.lock .

RUN apk add --no-cache zip

RUN deno install --frozen

CMD ["deno", "run", "--allow-all", "tasks/archive.ts"]
