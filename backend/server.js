import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import fs from "fs";
import { execFile } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from 'uuid'; // Import uuid برای تولید نام فایل‌های منحصر به فرد

// تعریف __dirname در ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسیر اسکریپت پایتون
const PROCESS_IMAGE_PATH = path.join(__dirname, "process_image.py");
const REMBG_MODEL_NAME = "u2net_human_seg";
const app = express();
// پورت از متغیر محیطی یا 8080
const PORT = process.env.PORT || 8080;

app.use(fileUpload());
app.use(cors({
  origin: '*', // در صورت نیاز می‌توانید این مقدار را محدودتر کنید، مثلاً 'https://your-frontend-domain.com'
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// روت API برای حذف بک‌گراند
app.post("/api/remove-bg", (req, res) => {
  console.log("Received request to /api/remove-bg");

  try {
    if (!req.files || !req.files.file) {
      console.error("No file uploaded");
      return res.status(400).json({ error: "No file uploaded" });
    }
    const uploadedFile = req.files.file;

    // تولید نام فایل‌های موقت منحصر به فرد
    const uniqueId = uuidv4();
    const inputPath = path.join(__dirname, `${uniqueId}_input.png`);
    const noBgPath = path.join(__dirname, `${uniqueId}_noBg.png`);
    const outputPath = path.join(__dirname, `${uniqueId}_output.png`);

    console.log(`Saving uploaded file to ${inputPath}`);
    // ذخیره موقت فایل ورودی
    fs.writeFileSync(inputPath, uploadedFile.data);

    // اجرای دستور rembg
    console.log("Executing rembg command");
    execFile(
      "rembg",
      [
        "i",
        "--model", REMBG_MODEL_NAME,
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
          // پاک کردن فایل‌های موقت
          fs.unlinkSync(inputPath);
          return res.status(500).json({ error: "Failed to remove background" });
        }

        console.log("rembg command executed successfully");

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

        console.log("Executing Python script for effects");
        // اجرای اسکریپت پایتون برای افکت‌ها
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
              // پاک کردن فایل‌های موقت
              fs.unlinkSync(inputPath);
              fs.unlinkSync(noBgPath);
              return res.status(500).json({ error: "Python script failed" });
            }

            try {
              console.log(`Reading output file from ${outputPath}`);
              // خواندن فایل خروجی
              const outputBuffer = fs.readFileSync(outputPath);
              const base64 = `data:image/png;base64,${outputBuffer.toString("base64")}`;

              // پاک کردن فایل‌های موقت
              fs.unlinkSync(inputPath);
              fs.unlinkSync(noBgPath);
              fs.unlinkSync(outputPath);

              // ارسال نتیجه به فرانت‌اند
              console.log("Sending response to frontend");
              return res.json({ base64 });
            } catch (readErr) {
              console.error("Error reading output file:", readErr);
              // پاک کردن فایل‌های موقت
              fs.unlinkSync(inputPath);
              fs.unlinkSync(noBgPath);
              fs.unlinkSync(outputPath);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
