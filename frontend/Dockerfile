# Stage 1: Build the Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files
COPY . .

# Optional build-time argument for API Base URL
ARG VITE_API_BASE_URL="http://localhost:8000"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Build the production bundle into /app/dist
RUN npm run build

# Stage 2: Development stage (optional target for local Docker development)
FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# Stage 3: Production runner using lightweight Nginx
FROM nginx:alpine AS runner

# Clean default static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built distribution files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
