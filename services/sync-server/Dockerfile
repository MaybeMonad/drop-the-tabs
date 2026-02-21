FROM node:20-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache postgresql-client

# Copy package files
COPY package.json ./
COPY ../../packages/shared-core/package.json ./packages/shared-core/
COPY ../../packages/shared-api/package.json ./packages/shared-api/

# Install dependencies
RUN npm install

# Copy source
COPY . .
COPY ../../packages/shared-core ../shared-core
COPY ../../packages/shared-api ../shared-api

# Build
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
