# Multi-stage Dockerfile for microservices

# Base stage with common dependencies
FROM node:18 AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Catalog service stage
FROM base AS catalog-service
RUN apt-get update && apt-get install -y sqlite3 curl
COPY src/catalog ./src/catalog
COPY src/nginx ./src/nginx
EXPOSE 5000
CMD ["node", "src/catalog/index.js"]

# Order service stage
FROM base AS order-service
RUN apt-get update && apt-get install -y curl
COPY src/order ./src/order
COPY src/nginx ./src/nginx
EXPOSE 4000
CMD ["node", "src/order/index.js"]

# Client service stage
FROM base AS client-service
RUN apt-get update && apt-get install -y curl
COPY src/client ./src/client
EXPOSE 3007
CMD ["node", "src/client/index.mjs"]

# Development stage (for running all services together)
FROM base AS development
RUN npm install -g concurrently
RUN apt-get update && apt-get install -y sqlite3
COPY . .
EXPOSE 4000
EXPOSE 5000
EXPOSE 3007
CMD ["concurrently", "node src/catalog/index.js", "node src/order/index.js", "node src/client/index.mjs"]