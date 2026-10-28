# 包装视觉顾问 Packaging Advisor — production image
# Node 24 has the built-in SQLite module (node:sqlite) used for storage.
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# a licensed 瘦金体 web font, if you have one (it is built into the pages): see .env.example
ARG NEXT_PUBLIC_SHOUJIN_FONT_URL=""
ENV NEXT_PUBLIC_SHOUJIN_FONT_URL=$NEXT_PUBLIC_SHOUJIN_FONT_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/app/data \
    SKILLS_DIR=/app/skills
RUN useradd --system --uid 1001 app && mkdir -p /app/data && chown app /app/data
COPY --from=build --chown=app /app/.next/standalone ./
COPY --from=build --chown=app /app/.next/static ./.next/static
# the standalone server serves public/ but does not copy it: the films' fallbacks and the fonts
COPY --from=build --chown=app /app/public ./public
COPY --from=build --chown=app /app/skills ./skills
USER app
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
