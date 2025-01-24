import { useState } from "react";

function App() {
  const backgrounds = [
    "/back.JPG",
  ];

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [subjectSrc, setSubjectSrc] = useState(null);
  const [bgUrl, setBgUrl] = useState(null);
  const [boxWidth, setBoxWidth] = useState(null);
  const [boxHeight, setBoxHeight] = useState(null);
  const [loading, setLoading] = useState(false);

  const [effects, setEffects] = useState({
    blackWhiteLevel: 0.2,
    posterizeBits: 4,
    contrastFactor: 1.0,
    overlayAlpha: 0.5,
    blackLevel: 0.2,
    whiteLevel: 0.8,
    faceEnhance: false,
    brightness: 0.0,
    saturation: 0.0,
    sharpness: 0.0,
    hue: 0.0,
    blur: 0.0,
    vignette: 0.0,
    skinSmooth: 0.0,
    eyeBrighten: 0.0,
    teethWhiten: 0.0,
    lipstick: 0.0,
    eyelashEnhance: 0.0,
    addGlasses: false,
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewSrc(null);
    setSubjectSrc(null);
    setBgUrl(null);
    setBoxWidth(null);
    setBoxHeight(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setPreviewSrc(dataUrl);

      const img = new Image();
      img.onload = () => {
        // در اینجا اگر بخواهید مقیاس را محدود کنید، می‌توانید اعمال کنید.
        setBoxWidth(img.width);
        setBoxHeight(img.height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleEffectChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEffects((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : parseFloat(value),
    }));
  };

  // این تابع دو آدرس عکس و ابعاد نهایی را می‌گیرد و یک dataURL (Base64) نهایی برمی‌گرداند.
async function mergeImages(bgUrl, subjectUrl, width, height) {
  // 1) ساختن یک المان canvas در حافظه
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // 2) لود کردن عکس پس‌زمینه (به‌صورت Image)
  const bgImg = new Image();
  bgImg.crossOrigin = "anonymous"; // تا در صورت نیاز دچار مشکل CORS نشویم
  bgImg.src = bgUrl;
  await new Promise((resolve) => {
    bgImg.onload = resolve;
  });

  // 3) لود کردن عکس سوژه
  const subjectImg = new Image();
  subjectImg.crossOrigin = "anonymous";
  subjectImg.src = subjectUrl;
  await new Promise((resolve) => {
    subjectImg.onload = resolve;
  });

  // 4) رسم عکس پس‌زمینه در ابعاد canvas
  // روش ساده (Stretch): بک‌گراند را دقیقاً به اندازه‌ی subject بکشیم.
  // ctx.drawImage(bgImg, 0, 0, width, height);

  // یا اگر بخواهیم "cover" کنیم تا نسبت تصویر پس‌زمینه حفظ شود،
  // محاسبه می‌کنیم کدام بعد باید بیشتر اسکیل شود:
  const subjectRatio = width / height;
  const bgRatio = bgImg.width / bgImg.height;

  let drawWidth, drawHeight, offsetX, offsetY;
  if (bgRatio > subjectRatio) {
    // پس‌زمینه در عرض عریض‌تر است، ارتفاع را فیکس کرده و عرض را حساب می‌کنیم
    drawHeight = height;
    drawWidth = bgImg.width * (height / bgImg.height);
    offsetX = (width - drawWidth) / 2;
    offsetY = 0;
  } else {
    // پس‌زمینه نسبتا باریک‌تر یا مربعی‌تر است، عرض را فیکس کرده و ارتفاع را حساب می‌کنیم
    drawWidth = width;
    drawHeight = bgImg.height * (width / bgImg.width);
    offsetX = 0;
    offsetY = (height - drawHeight) / 2;
  }
  ctx.drawImage(bgImg, offsetX, offsetY, drawWidth, drawHeight);

  // 5) رسم عکس سوژه روی بک‌گراند
  // فرض می‌کنیم در همان ابعاد اصلی سوژه (width, height) می‌خواهیم قرار دهیم:
  ctx.drawImage(subjectImg, 0, 0, width, height);

  // 6) گرفتن خروجی به فرم Base64
  return canvas.toDataURL("image/png");
}


  const handleRemoveBG = async () => {
    if (!selectedFile) {
      alert("لطفاً یک عکس انتخاب کنید!");
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      // افزودن پارامترهای افکت‌ها
      Object.keys(effects).forEach((key) => {
        formData.append(key, effects[key]);
      });

      const response = await fetch("/api/remove-bg", {
        method: "POST",
        body: formData,
      });
      

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "خطایی در پردازش حذف بک‌گراند رخ داد.");
      }

      const data = await response.json();
      if (data.base64) {
        setSubjectSrc(data.base64);
        const randomIndex = Math.floor(Math.random() * backgrounds.length);
        setBgUrl(backgrounds[randomIndex]);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "مشکلی در پردازش حذف بک‌گراند پیش آمد.");
    } finally {
      setLoading(false);
    }
  };

  // دکمهٔ دانلود تصویر خروجی
 // ...
const handleDownload = async () => {
  if (!subjectSrc || !bgUrl || !boxWidth || !boxHeight) {
    return;
  }
  try {
    // فراخوانی تابع mergeImages
    const mergedDataURL = await mergeImages(bgUrl, subjectSrc, boxWidth, boxHeight);

    // ساخت یک لینک موقت برای دانلود
    const link = document.createElement("a");
    link.href = mergedDataURL;
    link.download = "final_image.png";
    link.click();
  } catch (error) {
    console.error("Error merging images:", error);
  }
};


  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", color: "black" }}>
      {/* پس‌زمینه‌ی بلور شده */}
      <div
        style={{
          position: "fixed",
          zIndex: -1,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "url('/backgroundsite.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(10px)",
        }}
      ></div>

      {/* محتوای اصلی */}
      <div
        style={{
          // یک کانتینر برای وسط‌چین بودن و ریسپانسیو شدن
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-center",
          margin: "0 auto",
          padding: "2rem",
          maxWidth: "1200px",
        }}
      >
        <h1 style={{ textAlign: "center", color: "#fff" }}>
        Silhouette your Images {":)"}
        </h1>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ margin: "1rem 0" }}
        />

        {/* بخش تنظیم افکت‌ها */}
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: "8px",
            padding: "1rem",
            margin: "1rem 0",
            width: "100%",
            
          }}
        >
          <h3>تنظیمات افکت‌ها:</h3>
          {/* هر بخش ورودی */}
          <div>
            <label>
              Black & White Level:
              <input
                type="number"
                name="blackWhiteLevel"
                value={effects.blackWhiteLevel}
                onChange={handleEffectChange}
                step="0.1"
                min="0"
                max="1"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>0 تا 1</span>
          </div>

          <div>
            <label>
              Posterize Bits:
              <input
                type="number"
                name="posterizeBits"
                value={effects.posterizeBits}
                onChange={handleEffectChange}
                step="1"
                min="1"
                max="8"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>1 تا 8</span>
          </div>

          <div>
            <label>
              Contrast Factor:
              <input
                type="number"
                name="contrastFactor"
                value={effects.contrastFactor}
                onChange={handleEffectChange}
                step="0.1"
                min="0.1"
                max="3"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>0.1 تا 3</span>
          </div>

          <div>
            <label>
              Overlay Alpha:
              <input
                type="number"
                name="overlayAlpha"
                value={effects.overlayAlpha}
                onChange={handleEffectChange}
                step="0.1"
                min="0"
                max="1"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>0 تا 1</span>
          </div>



          <div>
            <label>
              Brightness:
              <input
                type="number"
                name="brightness"
                value={effects.brightness}
                onChange={handleEffectChange}
                step="0.1"
                min="-1"
                max="1"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>-1 تا 1</span>
          </div>

          <div>
            <label>
              Saturation:
              <input
                type="number"
                name="saturation"
                value={effects.saturation}
                onChange={handleEffectChange}
                step="0.1"
                min="-1"
                max="1"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>-1 تا 1</span>
          </div>

          <div>
            <label>
              Sharpness:
              <input
                type="number"
                name="sharpness"
                value={effects.sharpness}
                onChange={handleEffectChange}
                step="0.1"
                min="-1"
                max="1"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>-1 تا 1</span>
          </div>

          <div>
            <label>
              Hue:
              <input
                type="number"
                name="hue"
                value={effects.hue}
                onChange={handleEffectChange}
                step="1"
                min="-180"
                max="180"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>-180 تا 180</span>
          </div>

          <div>
            <label>
              Blur:
              <input
                type="number"
                name="blur"
                value={effects.blur}
                onChange={handleEffectChange}
                step="1"
                min="0"
                max="100"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>0 تا 100</span>
          </div>

          <div>
            <label>
              Vignette:
              <input
                type="number"
                name="vignette"
                value={effects.vignette}
                onChange={handleEffectChange}
                step="0.1"
                min="0"
                max="1"
              />
            </label>
            <span style={{ marginLeft: "10px" }}>0 تا 1</span>
          </div>

        </div>

        {/* پیش‌نمایش اولیه (ورودی) */}
        {previewSrc && (
          <div style={{ margin: "1rem 0" }}>
            <p style={{ color: "#fff", textAlign: "center" }}>پیش‌نمایش (ورودی):</p>
            <img
              src={previewSrc}
              alt="Preview"
              style={{
                maxWidth: "90vw",
                height: "auto",
                border: "2px solid #ccc",
                display: "block",
                margin: "0 auto",
              }}
            />
          </div>
        )}

        <button
          onClick={handleRemoveBG}
          disabled={loading}
          style={{
            margin: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "در حال پردازش..." : "حذف بک‌گراند"}
        </button>

        {/* اگر تصویر خروجی وجود داشته باشد، دکمهٔ دانلود نشان داده شود */}
        {subjectSrc && (
          <button
            onClick={handleDownload}
            style={{
              margin: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            دانلود عکس
          </button>
        )}

        {/* خروجی نهایی با پس‌زمینه‌ی رندوم */}
        {subjectSrc && boxWidth && boxHeight && (
          <div
            style={{
              margin: "2rem auto",
              position: "relative",
              border: "2px solid #ccc",
              // برای محدودیت ریسپانسیو، می‌توانیم به جای width/height ثابت از maxWidth/maxHeight استفاده کنیم:
              width: "auto",
              height: "auto",
              maxWidth: "90vw",
            }}
          >
            {/* لایه بک‌گراند */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: bgUrl ? `url(${bgUrl})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* لایه سوژه */}
            <div
              style={{
                position: "relative",
              }}
            >
              <img
                src={subjectSrc}
                alt="Subject"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;