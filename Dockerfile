FROM denoland/deno:latest AS build

WORKDIR /app

COPY . .
RUN deno install
RUN deno task docker

FROM nginx:stable-alpine
COPY --from=build /app/release/online /usr/share/nginx/html
