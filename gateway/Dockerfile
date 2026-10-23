# Gateway Dockerfile
# Uses a slim Node image to keep the image small.
# node:20-alpine is ~50MB vs node:20 at ~350MB.

FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy package files first — Docker caches this layer.
# As long as package.json doesn't change, npm install won't re-run on rebuild.
COPY package*.json ./

# Install only production dependencies (no devDependencies)
RUN npm install --omit=dev

# Copy the rest of the source code
COPY . .

# Document the port (doesn't actually publish it — docker-compose does that)
EXPOSE 3000

# Start the gateway
CMD ["node", "server.js"]
