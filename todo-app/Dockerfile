FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY . .

# Default environment port variable if not overridden by Kubernetes
ENV PORT=3000

CMD ["node", "index.js"]
