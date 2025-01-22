FROM python:3.9.6-bullseye
# مرحله اول: بیلد فرانت‌اند
FROM node:18-slim AS frontend-builder
WORKDIR /app-frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# مرحله دوم: ایمیج نهایی
FROM python:3.9.6-slim-bullseye

# 2) نصب ابزارهای پایه + افزودن مخزن NodeSource و نصب Node.js 18
# نصب Node.js روی نسخه‌ی slim:
RUN apt-get update && apt-get install -y curl \
&& curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
&& apt-get install -y nodejs \
&& apt-get clean \
&& curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
&& apt-get install -y nodejs \
&& apt-get clean


# 3) تعیین دایرکتوری کاری در کانتینر
WORKDIR /app

# 4) کپی فایل‌های package.json و package-lock.json بک‌اند
COPY backend/package*.json ./

# 5) نصب وابستگی‌های Node.js
RUN npm install

# 6) کپی فایل‌های requirements.txt برای پایتون
COPY backend/requirements.txt ./

# 7) نصب کتابخانه‌های پایتون (نسخه‌ی دقیقاً 3.9.6)
RUN pip install --no-cache-dir -r requirements.txt

# 8) کپی باقی فایل‌های backend (server.js, process_image.py و ...)
COPY backend/ ./
RUN mkdir -p public
COPY --from=frontend-builder /app-frontend/dist public

# 9) اگر پورت 4000 دارید (مثلاً در server.js)، آن را اکسپوز کنید
EXPOSE 4000
# در صورت نیاز نصب rembg
RUN pip install rembg==2.0.30

# 10) فرمان نهایی برای اجرای سرور Node (start در package.json فرضاً = "node server.js")
EXPOSE 4000
CMD ["npm", "start"]