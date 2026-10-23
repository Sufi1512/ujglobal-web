# Live website image, built from the repository root (compose.yml). Same as apps/web/Dockerfile, but it
# also reads the .env your hosting panel puts next to compose.yml: SITE_URL (and TURNSTILE_SITE_KEY) at
# build time, and REVALIDATE_SECRET for runtime. Only that one secret is kept in this image. Build
# arguments and real environment variables, when the panel passes them, take priority.
FROM node:22-alpine AS deps
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ .
COPY infra/single-port/read-setting.sh /usr/local/bin/read-setting
COPY .env.production.example .env* /tmp/settings/
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN SITE="$(read-setting /tmp/settings/.env SITE_URL)"; SITE="${SITE:-https://ujglobal.tech}"; \
    export NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-$SITE}" \
           NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-$SITE}" \
           NEXT_PUBLIC_TURNSTILE_SITE_KEY="${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-$(read-setting /tmp/settings/.env TURNSTILE_SITE_KEY)}"; \
    echo "Building for $NEXT_PUBLIC_SITE_URL"; \
    npm run build \
    && mkdir -p /app/settings \
    && printf '%s' "$(read-setting /tmp/settings/.env REVALIDATE_SECRET)" > /app/settings/revalidate-secret \
    && chmod 750 /app/settings && chmod 640 /app/settings/revalidate-secret \
    && rm -rf /tmp/settings

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=9006 HOSTNAME=0.0.0.0 API_INTERNAL_URL=http://api:9005
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build --chown=root:node /app/settings /app/settings
USER node
EXPOSE 9006
CMD ["sh", "-c", "export REVALIDATE_SECRET=\"${REVALIDATE_SECRET:-$(cat /app/settings/revalidate-secret 2>/dev/null)}\"; exec node server.js"]
