# ---- Stage 1: build the SPA ----
FROM node:22-alpine AS build
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# Vite inlines VITE_* variables at build time — the API URL is baked into the
# bundle by this argument, not read when the container starts.
ARG VITE_API_URL=http://localhost:5004/api
ENV VITE_API_URL=$VITE_API_URL
# Docker images always talk to the real backend; the mock layer is a host-dev
# default (`.env.example` sets it to true) and would silently serve fake data
# here because `VITE_USE_MOCK_API !== 'false'` defaults to mocks.
ARG VITE_USE_MOCK_API=false
ENV VITE_USE_MOCK_API=$VITE_USE_MOCK_API
RUN pnpm build

# ---- Stage 2: nginx serving the static build with SPA fallback ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
