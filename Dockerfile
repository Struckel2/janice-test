# Stage 1: Builder
FROM node:18-bullseye AS builder

# Install essential build tools
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    git \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Stage 2: Runtime
FROM node:18-bullseye-slim

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy node_modules and app from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

# Environment variables
ENV PORT=3000
ENV MODEL_PATH=/models

# Create volume mount point for models
RUN mkdir -p /models && chmod 777 /models

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/index.js"]
