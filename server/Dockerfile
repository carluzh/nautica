# Nautica server — runs via tsx (no build step). For a GCloud VM / Cloud Run.
FROM node:22-slim

WORKDIR /app

# Install deps first for layer caching.
COPY package.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src ./src

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
