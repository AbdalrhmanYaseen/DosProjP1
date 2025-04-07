FROM node:latest
WORKDIR /app
COPY . .
RUN apt-get update
RUN npm install
EXPOSE 5000
CMD ["node", "index.js"]
