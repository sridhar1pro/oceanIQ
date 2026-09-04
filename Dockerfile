# ---------- Stage 1: Build Frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

# ---------- Stage 2: Production ----------
FROM python:3.11-slim AS production
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./
COPY data-pipeline/output/ ./data-pipeline/output/

# Copy built frontend into a static dir served by FastAPI
COPY --from=frontend-build /app/frontend/dist ./static

# Patch main.py to also serve the SPA from /static
# (FastAPI's StaticFiles mount is added at runtime via env var)
ENV SERVE_STATIC=1

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
