FROM node:lts-slim AS build

WORKDIR /app

COPY . ./
RUN --mount=type=cache,id=npm,target=/root/.npm npm ci
RUN npm run docker

FROM nginx:stable-alpine
COPY --from=build /app/release/online /usr/share/nginx/html
