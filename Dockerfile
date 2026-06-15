FROM node:22-slim

# Build tools — filet de sécurité si un module natif (@snazzah/davey)
# n'a pas de binaire précompilé pour la plateforme
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Start the bot
CMD ["node", "index.js"]
