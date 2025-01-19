// frontend/src/ImagePreview.jsx


function ImagePreview({
  backgroundUrl,
  subjectUrl,
  width = 600,  // یا هر مقدار پیشفرض
  height = 400, // یا هر مقدار پیشفرض
}) {
  return (
    <div
      style={{
        position: "relative",
        width: width,           // مثلاً "600px" یا عدد
        height: height,         // مثلاً "400px"
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <img
        src={subjectUrl}
        alt="Subject"
        style={{
          position: "absolute",
          bottom: 0,           // از پایین بچسبد
          left: "50%",         // در عرض، وسط باشد
          transform: "translateX(-50%)",
        }}
      />
    </div>
  );
}

export default ImagePreview;
