FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Secure file permissions and assign to non-root node user
RUN chown -R node:node /usr/src/app

# Run as non-root user for security hardening
USER node

# Expose server port
EXPOSE 5000

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
