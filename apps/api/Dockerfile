# Deploy alternativo no Render (runtime: Docker). Monorepo na raiz.
FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contratos/package.json packages/contratos/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN npm ci --include=dev

COPY packages/contratos packages/contratos
COPY apps/api apps/api

RUN npm run db:migrate -w apps/api

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "run", "start", "-w", "apps/api"]