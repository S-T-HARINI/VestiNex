FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
COPY prisma ./prisma
RUN npm install

# Copy source
COPY backend .

# Generate Prisma Client
RUN npx prisma generate --schema=./prisma/schema.prisma || true

EXPOSE 4000

CMD ["npm", "run", "dev"]
