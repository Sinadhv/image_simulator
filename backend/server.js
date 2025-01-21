import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// تعریف __dirname در ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// می‌توانید اگر از rembg با path مشخص استفاده می‌کنید اینجا تعریف کنید، مثلاً:
// const REMBG_PATH = path.join(__dirname, "venv", "bin", "rembg");
// یا اگر در Docker نصب global شده، به‌صورت ساده rembg قابل دسترس است.

// مسیر فایل‌های موقت
const inputPath = path.join(__dirname, "input.png");
const noBgPath = path.join(__dirname, "no_bg.png");
const outputPath = path.join(__dirname, "output.png");

// مسیر اسکریپت پایتون
const PROCESS_IMAGE_PATH = path.join(__dirname, "process_image.py");

const app = express();
// پورت از متغیر محیطی یا 4000
const PORT = process.env.PORT || 4000;

app.use(fileUpload());
app.use(cors());

// روت API برای حذف بک‌گراند
app.post("/api/remove-bg", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const uploadedFile = req.files.file;

    // ذخیره موقت فایل ورودی
    fs.writeFileSync(inputPath, uploadedFile.data);

    // اجرای دستور rembg یا هر چیزی که می‌خواهید
    // در اینجا به عنوان نمونه:
    execFile(
      "rembg", // یا اگر در Docker روش دیگری نصب کرده‌اید، مسیرش را ست کنید
      [
        "i",
        "--model", "u2net_human_seg",
        "--alpha-matting",
        "--alpha-matting-foreground-threshold", "240",
        "--alpha-matting-background-threshold", "80",
        "--alpha-matting-erode-size", "20",
        inputPath,
        noBgPath
      ],
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error in rembg child_process:", err);
          console.error("stderr output:", stderr);
          return res.status(500).json({ error: "Failed to remove background" });
        }

        // پارامترهای افکت‌ها از body
        const {
          blackWhiteLevel = 0.2,
          posterizeBits = 4,
          contrastFactor = 1.0,
          overlayAlpha = 0.5,
          blackLevel = 0.2,
          whiteLevel = 0.8,
          faceEnhance = false,
          brightness = 0.0,
          saturation = 0.0,
          sharpness = 0.0,
          hue = 0.0,
          blur = 0.0,
          vignette = 0.0,
          skinSmooth = 0.0,
          eyeBrighten = 0.0,
          teethWhiten = 0.0,
          lipstick = 0.0,
          eyelashEnhance = 0.0,
          addGlasses = false,
        } = req.body;

        // تبدیل مقادیر به عدد/بولین
        const blackWhiteLevelNum = parseFloat(blackWhiteLevel);
        const posterizeBitsNum = parseInt(posterizeBits, 10);
        const contrastFactorNum = parseFloat(contrastFactor);
        const overlayAlphaNum = parseFloat(overlayAlpha);
        const blackLevelNum = parseFloat(blackLevel);
        const whiteLevelNum = parseFloat(whiteLevel);
        const faceEnhanceBool = faceEnhance === 'true' || faceEnhance === true;
        const brightnessNum = parseFloat(brightness);
        const saturationNum = parseFloat(saturation);
        const sharpnessNum = parseFloat(sharpness);
        const hueNum = parseFloat(hue);
        const blurNum = parseFloat(blur);
        const vignetteNum = parseFloat(vignette);
        const skinSmoothNum = parseFloat(skinSmooth);
        const eyeBrightenNum = parseFloat(eyeBrighten);
        const teethWhitenNum = parseFloat(teethWhiten);
        const lipstickNum = parseFloat(lipstick);
        const eyelashEnhanceNum = parseFloat(eyelashEnhance);
        const addGlassesBool = addGlasses === 'true' || addGlasses === true;

        // اگر خواستید ولیدیشن کنید، می‌توانید اینجا انجام دهید (محدوده اعداد و ...)

        // حالا اجرای اسکریپت پایتون برای افکت‌ها:
        execFile(
          "python3",
          [
            PROCESS_IMAGE_PATH,
            noBgPath,
            outputPath,
            "--blackWhiteLevel", blackWhiteLevelNum,
            "--posterizeBits", posterizeBitsNum,
            "--contrastFactor", contrastFactorNum,
            "--overlayAlpha", overlayAlphaNum,
            "--blackLevel", blackLevelNum,
            "--whiteLevel", whiteLevelNum,
            "--faceEnhance", faceEnhanceBool,
            "--brightness", brightnessNum,
            "--saturation", saturationNum,
            "--sharpness", sharpnessNum,
            "--hue", hueNum,
            "--blur", blurNum,
            "--vignette", vignetteNum,
            "--skinSmooth", skinSmoothNum,
            "--eyeBrighten", eyeBrightenNum,
            "--teethWhiten", teethWhitenNum,
            "--lipstick", lipstickNum,
            "--eyelashEnhance", eyelashEnhanceNum,
            "--addGlasses", addGlassesBool
          ],
          (pyErr, pyStdout, pyStderr) => {
            console.log("Python stdout:", pyStdout);
            console.log("Python stderr:", pyStderr);

            if (pyErr) {
              console.error("Error in Python script:", pyErr);
              return res.status(500).json({ error: "Python script failed" });
            }

            try {
              // خواندن فایل خروجی
              const outputBuffer = fs.readFileSync(outputPath);
              const base64 = `data:image/png;base64,${outputBuffer.toString("base64")}`;

              // پاک کردن فایل‌های موقت
              fs.unlinkSync(inputPath);
              fs.unlinkSync(noBgPath);
              fs.unlinkSync(outputPath);

              // ارسال نتیجه به فرانت‌اند
              return res.json({ base64 });
            } catch (readErr) {
              console.error("Error reading output file:", readErr);
              return res.status(500).json({ error: "Failed to read output file" });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error("Error in /api/remove-bg route:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------------------------------------------------------
// سرو کردن فایل‌های بیلدشده React از فولدر "public":
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// هر مسیری که در بالا نبود، بفرست سمت index.html برای پشتیبانی از روت‌های SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// -------------------------------------------------------------------
// لیسن کردن سرور:
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});