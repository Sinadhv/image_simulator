# 1) استفاده از ایمیج رسمی پایتون 3.9.6 با توزیع Debian Bullseye
FROM python:3.9.6-bullseye

# 2) نصب ابزارهای پایه + افزودن مخزن NodeSource و نصب Node.js 18
RUN apt-get update && apt-get install -y curl \
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

# 9) اگر پورت 4000 دارید (مثلاً در server.js)، آن را اکسپوز کنید
EXPOSE 4000

# 10) فرمان نهایی برای اجرای سرور Node (start در package.json فرضاً = "node server.js")
CMD ["npm", "start"]
