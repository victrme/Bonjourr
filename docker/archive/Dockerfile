FROM denoland/deno:alpine-2.8.1

COPY . .

RUN apk add --no-cache zip

RUN deno install --frozen

CMD ["deno", "run", "--allow-all", "tasks/archive.ts"]
