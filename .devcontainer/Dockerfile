# Dev image for OmniRoute — matches .nvmrc (Node 24), same Debian base as the
# production Dockerfile (trixie). Build tools are required for better-sqlite3
# and other native modules compiled during `npm ci`.
FROM node:24-trixie-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

USER node
