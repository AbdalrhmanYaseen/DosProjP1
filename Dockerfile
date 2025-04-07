FROM node:18

WORKDIR /app

RUN apt-get update && apt-get install -y sqlite3

COPY package*.json ./

RUN npm install -g concurrently
RUN npm install

COPY . .

EXPOSE 4000
EXPOSE 5000

CMD ["concurrently", "node catalog/index.js", "node order/index.js"]