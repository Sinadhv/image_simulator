# ────────────────────────────────────────────────────────────
# مرحلهٔ اول: بیلد فرانت‌اند
# ────────────────────────────────────────────────────────────
FROM node:18-slim AS frontend-builder

WORKDIR /app-frontend

# کپی پکیج‌های فرانت‌اند و نصب
COPY frontend/package*.json ./
RUN npm install

# کپی کل کد فرانت‌اند و اجرای بیلد
COPY frontend/ ./
RUN npm run build


# ────────────────────────────────────────────────────────────
# مرحلهٔ دوم: ایمیج نهایی (بک‌اند)
# ────────────────────────────────────────────────────────────
FROM python:3.9.6-slim-bullseye

# نصب ابزارهای ضروری + Node.js 18
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

WORKDIR /app

# کپی package.json و package-lock.json بک‌اند
COPY backend/package*.json ./
RUN npm install

# نصب کتابخانه‌های پایتون
COPY backend/requirements.txt ./
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# کپی بقیهٔ فایل‌های بک‌اند (مثلاً server.js, process_image.py, ...)
COPY backend/ ./

# ساخت فولدر public و کپی خروجی بیلد فرانت‌اند در آن
RUN mkdir -p public
COPY --from=frontend-builder /app-frontend/dist public

# نصب rembg
RUN pip install rembg==2.0.30

# ساخت فولدر کش rembg و دانلود مدل u2netp در آن
RUN mkdir -p /root/.u2net \
    && curl -L "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx" \
       -o /root/.u2net/u2netp.onnx \
    && chmod 644 /root/.u2net/u2netp.onnx

# تست یا Warm-up برای اینکه rembg بداند مدل لوکال را داریم
RUN rembg i --model u2netp /dev/null /dev/null || true

# اکسپوز پورت 8080 (بر اساس server.js)
EXPOSE 8080

# اجرای سرور Node
CMD ["npm", "start"]
