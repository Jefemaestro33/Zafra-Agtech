# Stage 1: Build React dashboard
FROM node:20-alpine AS frontend
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

# Stage 2: Python backend + static files
FROM python:3.13-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built dashboard from stage 1
COPY --from=frontend /app/dashboard/dist ./dashboard/dist

# Railway provides PORT env var
ENV PORT=8000
EXPOSE 8000

WORKDIR /app/backend
CMD uvicorn api:app --host 0.0.0.0 --port $PORT
