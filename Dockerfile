FROM node:22.6.0-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD [ "node", "src/index.js" ]
