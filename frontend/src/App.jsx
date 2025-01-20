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

  // وضعیت پارامترهای افکت‌ها (بدون Cartoon Factor)
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
        setBoxWidth(img.width);
        setBoxHeight(img.height);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // مدیریت تغییرات در ورودی افکت‌ها
  const handleEffectChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEffects((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : parseFloat(value),
    }));
  };

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

      // اگر در Docker نهایی پورت 4000 باشد، همین لینک جواب می‌دهد:
      const response = await fetch("http://localhost:4000/api/remove-bg", {
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

  return (
    <div style={{ textAlign: "center", margin: "0 auto", padding: "1rem" }}>
      <h1>Dynamic Box + Random BG (Show after server data)</h1>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {/* فرم تنظیم افکت‌ها */}
      <div style={{ margin: "1rem 0", textAlign: "left", display: "inline-block" }}>
        <h3>تنظیمات افکت‌ها:</h3>
        {/* افکت سیاه و سفید */}
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
          <span style={{ marginLeft: "10px" }}>
            درجه‌ی سیاه و سفید تصویر (0 تا 1)
          </span>
        </div>
        {/* افکت پسترایز */}
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
          <span style={{ marginLeft: "10px" }}>
            تعداد بیت‌های پسترایز (1 تا 8)
          </span>
        </div>
        {/* افکت کنتراست */}
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
          <span style={{ marginLeft: "10px" }}>
            فاکتور تنظیم کنتراست تصویر (0.1 تا 3)
          </span>
        </div>
        {/* افکت Overlay Alpha */}
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
          <span style={{ marginLeft: "10px" }}>
            شفافیت افکت overlay (0 تا 1)
          </span>
        </div>
        {/* افکت Black Level */}
        <div>
          <label>
            Black Level:
            <input
              type="number"
              name="blackLevel"
              value={effects.blackLevel}
              onChange={handleEffectChange}
              step="0.1"
              min="0"
              max="1"
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            سطح سیاهی تصویر (0 تا 1)
          </span>
        </div>
        {/* افکت White Level */}
        <div>
          <label>
            White Level:
            <input
              type="number"
              name="whiteLevel"
              value={effects.whiteLevel}
              onChange={handleEffectChange}
              step="0.1"
              min="0"
              max="1"
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            سطح سفیدی تصویر (0 تا 1)
          </span>
        </div>
        {/* افکت Face Enhance */}
        <div>
          <label>
            Face Enhance:
            <input
              type="checkbox"
              name="faceEnhance"
              checked={effects.faceEnhance}
              onChange={handleEffectChange}
              style={{ marginLeft: "10px" }}
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            فعال/غیرفعال کردن افکت Face Enhance
          </span>
        </div>
        {/* افکت Brightness */}
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
          <span style={{ marginLeft: "10px" }}>
            تنظیم روشنایی تصویر (-1 تا 1)
          </span>
        </div>
        {/* افکت Saturation */}
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
          <span style={{ marginLeft: "10px" }}>
            تنظیم اشباع رنگ تصویر (-1 تا 1)
          </span>
        </div>
        {/* افکت Sharpness */}
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
          <span style={{ marginLeft: "10px" }}>
            تنظیم وضوح تصویر (-1 تا 1)
          </span>
        </div>
        {/* افکت Hue */}
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
          <span style={{ marginLeft: "10px" }}>
            تنظیم Hue تصویر (-180 تا 180)
          </span>
        </div>
        {/* افکت Blur */}
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
          <span style={{ marginLeft: "10px" }}>
            تنظیم میزان Blur تصویر (0 تا 100)
          </span>
        </div>
        {/* افکت Vignette */}
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
          <span style={{ marginLeft: "10px" }}>
            تنظیم میزان Vignette تصویر (0 تا 1)
          </span>
        </div>
        {/* افکت Skin Smooth */}
        <div>
          <label>
            Skin Smooth:
            <input
              type="number"
              name="skinSmooth"
              value={effects.skinSmooth}
              onChange={handleEffectChange}
              step="0.1"
              min="0"
              max="1"
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            تنظیم میزان Skin Smooth تصویر (0 تا 1)
          </span>
        </div>
        {/* افکت روشن‌سازی چشم‌ها */}
        <div>
          <label>
            Eye Brightening:
            <input
              type="number"
              name="eyeBrighten"
              value={effects.eyeBrighten}
              onChange={handleEffectChange}
              step="0.1"
              min="0"
              max="1"
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            تنظیم میزان روشن‌سازی چشم‌ها (0 تا 1)
          </span>
        </div>
        {/* افکت سفید کردن دندان‌ها */}
        <div>
          <label>
            Teeth Whitening:
            <input
              type="number"
              name="teethWhiten"
              value={effects.teethWhiten}
              onChange={handleEffectChange}
              step="0.1"
              min="0"
              max="1"
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            تنظیم میزان سفید کردن دندان‌ها (0 تا 1)
          </span>
        </div>
        {/* افکت لپ‌استیک */}
        <div>
          <label>
            Lipstick:
            <input
              type="number"
              name="lipstick"
              value={effects.lipstick}
              onChange={handleEffectChange}
              step="0.1"
              min="0"
              max="1"
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            تنظیم میزان اعمال لپ‌استیک (0 تا 1)
          </span>
        </div>
        {/* افکت افزایش حجم مژه‌ها */}
        <div>
          <label>
            Eyelash Enhancement:
            <input
              type="number"
              name="eyelashEnhance"
              value={effects.eyelashEnhance}
              onChange={handleEffectChange}
              step="0.1"
              min="0"
              max="1"
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            تنظیم میزان افزایش حجم مژه‌ها (0 تا 1)
          </span>
        </div>
        {/* افزودن عینک */}
        <div>
          <label>
            Add Glasses:
            <input
              type="checkbox"
              name="addGlasses"
              checked={effects.addGlasses}
              onChange={handleEffectChange}
              style={{ marginLeft: "10px" }}
            />
          </label>
          <span style={{ marginLeft: "10px" }}>
            افزودن عینک به صورت
          </span>
        </div>
      </div>

      {/* پیش‌نمایش اولیه (ورودی) */}
      {previewSrc && (
        <div style={{ margin: "1rem 0" }}>
          <p>پیش‌نمایش (ورودی):</p>
          <img
            src={previewSrc}
            alt="Preview"
            style={{ maxWidth: "300px", border: "1px solid #ccc" }}
          />
        </div>
      )}

      <button onClick={handleRemoveBG} disabled={loading}>
        {loading ? "در حال پردازش..." : "حذف بک‌گراند"}
      </button>

      {subjectSrc && boxWidth && boxHeight && (
        <div
          style={{
            width: boxWidth + "px",
            height: boxHeight + "px",
            margin: "2rem auto",
            position: "relative",
            border: "1px solid #ccc",
          }}
        >
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

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <img
              src={subjectSrc}
              alt="Subject"
              style={{
                maxWidth: boxWidth + "px",
                maxHeight: boxHeight + "px",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
