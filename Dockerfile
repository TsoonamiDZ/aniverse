# ---- Build stage ----
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run db:generate
RUN bun run build
# Assemble the standalone server + DB + static assets + start script
RUN cp -r db .next/standalone/db 2>/dev/null || true \
 && cp .env .next/standalone/ 2>/dev/null || true \
 && cp -r .next/static .next/standalone/.next/ \
 && cp -r public .next/standalone/ \
 && chmod +x start.sh

# ---- Run stage ----
FROM oven/bun:1 AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV PERSIST_DIR=/data
COPY --from=build /app/.next/standalone ./
EXPOSE 3000
CMD ["bash", "start.sh"]
