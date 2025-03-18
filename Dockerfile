FROM node:lts-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run docker

FROM nginx:stable-alpine
COPY --from=build /app/release/online /usr/share/nginx/html
