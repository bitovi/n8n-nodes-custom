ARG N8N_VERSION=latest
FROM n8nio/n8n:${N8N_VERSION} as builder

USER root
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json gulpfile.js ./
COPY scripts/ ./scripts/
COPY nodes/ ./nodes/

RUN pnpm install --frozen-lockfile

RUN pnpm run build


FROM n8nio/n8n:${N8N_VERSION}

LABEL io.n8n.version.base="${N8N_VERSION}"

USER root

RUN apk add --no-cache --virtual .build-deps git build-base python3-dev py3-pip && \
    pip install markitdown --break-system-packages && \
    apk del .build-deps

WORKDIR /home/node/.n8n/custom

COPY package.json .

RUN npm install --production

COPY --from=builder /app/dist/ .


RUN chown -R node:node /home/node/.n8n/custom

USER node

WORKDIR /home/node
