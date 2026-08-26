FROM node:20-alpine
WORKDIR /app
COPY package.json index.js ./
USER root

# Create the folder and hand ownership over to the node user
RUN mkdir -p /usr/share/app/files && chown -R node:node /usr/share/app/files

# Switch back to the non-root user execution context
USER node
CMD ["npm", "start"]
