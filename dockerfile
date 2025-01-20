# مرحله اول: بیلد فرانت‌اند
FROM node:18-slim AS frontend-builder
WORKDIR /app-frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# مرحله دوم: ایمیج نهایی
FROM python:3.9.6-slim-bullseye

# نصب Node.js روی نسخه‌ی slim:
RUN apt-get update && apt-get install -y curl \
  && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs \
  && apt-get clean

WORKDIR /app
COPY backend/package*.json ./
RUN npm install

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
RUN mkdir -p public
COPY --from=frontend-builder /app-frontend/dist public

# در صورت نیاز نصب rembg
RUN pip install rembg==2.0.30

EXPOSE 4000
CMD ["npm", "start"]
