FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript (if you build)
RUN npm run build || true

EXPOSE 3000

CMD ["npm", "run", "dev"]