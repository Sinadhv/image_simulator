// server.js
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

// مسیر کامل به فایل اجرایی rembg در محیط مجازی (در صورت نیاز)
const REMBG_PATH = path.join(__dirname, "venv", "bin", "rembg");

// مسیر فایل‌های موقت
const inputPath = path.join(__dirname, "input.png");
const noBgPath = path.join(__dirname, "no_bg.png");
const outputPath = path.join(__dirname, "output.png");

// مسیر اسکریپت پایتون
const PROCESS_IMAGE_PATH = path.join(__dirname, "process_image.py");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(fileUpload());
app.use(cors());

app.post("/api/remove-bg", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const uploadedFile = req.files.file;

    // نوشتن فایل آپلود شده به صورت موقت
    fs.writeFileSync(inputPath, uploadedFile.data);

    // اجرای دستور rembg برای حذف پس‌زمینه
    // --model u2net_human_seg + alpha matting
    execFile(
      REMBG_PATH,
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

        // دریافت پارامترهای افکت‌ها از درخواست
        const {
          blackWhiteLevel = 0.2, // پیش‌فرض 0.2
          posterizeBits = 4,      // پیش‌فرض 4
          contrastFactor = 1.0,   // پیش‌فرض 1.0
          overlayAlpha = 0.5,     // پیش‌فرض 0.5
          blackLevel = 0.2,       // پیش‌فرض 0.2
          whiteLevel = 0.8,       // پیش‌فرض 0.8
          faceEnhance = false,    // پیش‌فرض غیرفعال
          brightness = 0.0,       // پیش‌فرض 0.0
          saturation = 0.0,       // پیش‌فرض 0.0
          sharpness = 0.0,        // پیش‌فرض 0.0
          hue = 0.0,              // پیش‌فرض 0.0
          blur = 0.0,             // پیش‌فرض 0.0
          vignette = 0.0,         // پیش‌فرض 0.0
          skinSmooth = 0.0,       // پیش‌فرض 0.0
          eyeBrighten = 0.0,      // پیش‌فرض 0.0
          teethWhiten = 0.0,      // پیش‌فرض 0.0
          lipstick = 0.0,         // پیش‌فرض 0.0
          eyelashEnhance = 0.0,   // پیش‌فرض 0.0
          addGlasses = false,     // پیش‌فرض غیرفعال
        } = req.body;

        // اعتبارسنجی پارامترها (بدون cartoonFactor)
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

        const validations = [
          { value: blackWhiteLevelNum, min: 0, max: 1, name: "blackWhiteLevel" },
          { value: posterizeBitsNum, min: 1, max: 8, name: "posterizeBits" },
          { value: contrastFactorNum, min: 0.1, max: 3, name: "contrastFactor" },
          { value: overlayAlphaNum, min: 0, max: 1, name: "overlayAlpha" },
          { value: blackLevelNum, min: 0, max: 1, name: "blackLevel" },
          { value: whiteLevelNum, min: 0, max: 1, name: "whiteLevel" },
          { value: brightnessNum, min: -1, max: 1, name: "brightness" },
          { value: saturationNum, min: -1, max: 1, name: "saturation" },
          { value: sharpnessNum, min: -1, max: 1, name: "sharpness" },
          { value: hueNum, min: -180, max: 180, name: "hue" },
          { value: blurNum, min: 0, max: 100, name: "blur" },
          { value: vignetteNum, min: 0, max: 1, name: "vignette" },
          { value: skinSmoothNum, min: 0, max: 1, name: "skinSmooth" },
          { value: eyeBrightenNum, min: 0, max: 1, name: "eyeBrighten" },
          { value: teethWhitenNum, min: 0, max: 1, name: "teethWhiten" },
          { value: lipstickNum, min: 0, max: 1, name: "lipstick" },
          { value: eyelashEnhanceNum, min: 0, max: 1, name: "eyelashEnhance" },
        ];

        for (let param of validations) {
          if (isNaN(param.value) || param.value < param.min || param.value > param.max) {
            return res.status(400).json({ error: `Invalid ${param.name} parameter` });
          }
        }

        // اجرای اسکریپت پایتون با پارامترهای افکت‌ها (بدون cartoonFactor)
        execFile(
          "python3",
          [
            PROCESS_IMAGE_PATH,
            noBgPath,
            outputPath,
            "--blackWhiteLevel",
            blackWhiteLevelNum,
            "--posterizeBits",
            posterizeBitsNum,
            "--contrastFactor",
            contrastFactorNum,
            "--overlayAlpha",
            overlayAlphaNum,
            "--blackLevel",
            blackLevelNum,
            "--whiteLevel",
            whiteLevelNum,
            "--faceEnhance",
            faceEnhanceBool,
            "--brightness",
            brightnessNum,
            "--saturation",
            saturationNum,
            "--sharpness",
            sharpnessNum,
            "--hue",
            hueNum,
            "--blur",
            blurNum,
            "--vignette",
            vignetteNum,
            "--skinSmooth",
            skinSmoothNum,
            "--eyeBrighten",
            eyeBrightenNum,
            "--teethWhiten",
            teethWhitenNum,
            "--lipstick",
            lipstickNum,
            "--eyelashEnhance",
            eyelashEnhanceNum,
            "--addGlasses",
            addGlassesBool,
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
