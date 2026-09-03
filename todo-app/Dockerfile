# Use a slim Node Alpine image for a small footprint
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy the application source code (index.js, etc.)
COPY . .

# Set dynamic default environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Run the app directly using node
CMD [ "node", "index.js" ]
