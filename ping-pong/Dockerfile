FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY index.js ./
ENV PORT=3001
EXPOSE 3001
USER node
CMD ["npm", "start"]
