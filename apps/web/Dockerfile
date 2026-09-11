FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM base AS build
# Declared in the consuming stage — a top-level ARG would not be visible here.
# Promoted to ENV because Vite reads VITE_-prefixed vars from the process env at build time.
ARG VITE_BFF_URL=http://localhost:3000
ENV VITE_BFF_URL=$VITE_BFF_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
