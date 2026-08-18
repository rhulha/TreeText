FROM node:22-alpine

# better-sqlite3 needs to compile a native addon
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY db ./db
COPY lib ./lib
COPY public ./public

RUN mkdir -p instance

ENV PORT=8000
EXPOSE 8000

VOLUME /app/instance

CMD ["npm", "start"]
