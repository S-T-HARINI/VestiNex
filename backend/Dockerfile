FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY ../prisma ./prisma
RUN npm install

# Copy source
COPY . .

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma || true

EXPOSE 4000

CMD ["npm", "run", "dev"]
