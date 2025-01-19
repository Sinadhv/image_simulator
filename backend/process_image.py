# process_image.py

import cv2
import numpy as np
import argparse
import sys
import mediapipe as mp
import os

def blend_with_grayscale(image, alpha):
    """
    ترکیب تصویر اصلی با تصویر سیاه و سفید با استفاده از فاکتور alpha.
    alpha=0: بدون تغییر
    alpha=1: سیاه و سفید کامل
    """
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray_bgr = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        blended = cv2.addWeighted(gray_bgr, alpha, image, 1 - alpha, 0)
        return blended
    except Exception as e:
        print(f"Error in blend_with_grayscale: {e}")
        sys.exit(1)

def posterize(image, bits):
    """
    کاهش بیت رنگ تصویر برای ایجاد افکت پسترایز.
    bits: تعداد بیت‌های مورد استفاده برای هر کانال رنگ.
    """
    try:
        bins = 2 ** bits
        image = np.floor_divide(image, 256 // bins) * (256 // bins)
        return image.astype(np.uint8)
    except Exception as e:
        print(f"Error in posterize: {e}")
        sys.exit(1)

def adjust_contrast(image, factor):
    """
    تنظیم کنتراست تصویر.
    factor: فاکتور افزایش یا کاهش کنتراست. مقادیر >1 افزایش کنتراست، مقادیر <1 کاهش کنتراست.
    """
    try:
        contrasted = cv2.convertScaleAbs(image, alpha=factor, beta=0)
        return contrasted
    except Exception as e:
        print(f"Error in adjust_contrast: {e}")
        sys.exit(1)

def apply_overlay(image, alpha, color=(0, 0, 0)):
    """
    اعمال overlay با رنگ و شفافیت مشخص روی تصویر.
    color: رنگ overlay به فرمت BGR.
    alpha: میزان شفافیت overlay (0 تا 1).
    """
    try:
        overlay = np.full_like(image, color, dtype=np.uint8)
        blended = cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0)
        return blended
    except Exception as e:
        print(f"Error in apply_overlay: {e}")
        sys.exit(1)

def create_face_mask(image, face_landmarks):
    """
    ایجاد ماسک دقیق برای چهره بر اساس نقاط کلیدی تشخیص داده شده با استفاده از Convex Hull.
    """
    try:
        h, w, _ = image.shape
        points = []
        for landmark in face_landmarks.landmark:
            x, y = int(landmark.x * w), int(landmark.y * h)
            points.append((x, y))
        
        if points:
            # استفاده از Convex Hull برای ایجاد ماسک
            hull = cv2.convexHull(np.array(points, dtype=np.int32))
            mask = np.zeros((h, w), dtype=np.uint8)
            cv2.fillConvexPoly(mask, hull, 255)
            return mask
        else:
            print("No landmarks found to create mask.")
            return np.zeros((h, w), dtype=np.uint8)
    except Exception as e:
        print(f"Error in create_face_mask: {e}")
        sys.exit(1)

def draw_red_border(image, mask, thickness=2):
    """
    رسم یک حاشیه قرمز دور ناحیه ماسک شده.
    """
    try:
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(image, contours, -1, (0, 0, 255), thickness)
        return image
    except Exception as e:
        print(f"Error in draw_red_border: {e}")
        sys.exit(1)

def apply_effects_to_face(image, mask, args, face_landmarks):
    """
    اعمال افکت‌ها به ناحیه چهره مشخص شده توسط ماسک.
    """
    try:
        #face_region = cv2.bitwise_and(image, image, mask=mask)
        # بقیه‌ی افکت‌های مخصوص چهره (مثلاً unsharp، bilateralFilter...) اینجا قابل افزودنند.

        final_image = image
        # مثلا اگر بخواهید دور ماسک چهره حاشیه قرمز بکشید:
        #final_image = draw_red_border(final_image, mask, thickness=2)

        return final_image
    except Exception as e:
        print(f"Error in apply_effects_to_face: {e}")
        sys.exit(1)

def adjust_brightness(image, factor):
    """
    تنظیم روشنایی تصویر.
    factor: فاکتور تنظیم روشنایی. مقادیر مثبت = افزایش روشنایی، منفی = کاهش روشنایی.
    """
    try:
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 2] = hsv[:, :, 2] * (1 + factor)
        hsv[:, :, 2] = np.clip(hsv[:, :, 2], 0, 255)
        bright_image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        return bright_image
    except Exception as e:
        print(f"Error in adjust_brightness: {e}")
        sys.exit(1)

def adjust_saturation(image, factor):
    """
    تنظیم اش saturate یک تر معشری تصویر.
    factor: فاکتور تنظیم اش saturate. مقادیر مثبت افزایش اش saturate، منفی کاهش اش saturate.
    """
    try:
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 1] = hsv[:, :, 1] * (1 + factor)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1], 0, 255)
        saturated_image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        return saturated_image
    except Exception as e:
        print(f"Error in adjust_saturation: {e}")
        sys.exit(1)

def adjust_sharpness(image, factor):
    """
    تنظیم وضوح تصویر.
    factor: فاکتور تنظیم وضوح. مقادیر مثبت افزایش وضوح، مقادیر منفی کاهش وضوح.
    """
    try:
        if factor == 0:
            return image

        if factor > 0:
            gaussian = cv2.GaussianBlur(image, (9, 9), 10.0)
            sharp_image = cv2.addWeighted(image, 1 + factor, gaussian, -factor, 0)
            return sharp_image
        else:
            blurred = cv2.GaussianBlur(image, (9, 9), 0)
            blurred = cv2.addWeighted(image, 1 + factor, blurred, -factor, 0)
            return blurred
    except Exception as e:
        print(f"Error in adjust_sharpness: {e}")
        sys.exit(1)

def adjust_hue(image, factor):
    """
    تنظیم Hue تصویر.
    factor: فاکتور تنظیم Hue. مقادیر مثبت چرخش Hue به جلو، مقادیر منفی چرخش Hue به عقب.
    """
    try:
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:, :, 0] = (hsv[:, :, 0] + factor) % 180
        hsv[:, :, 0] = np.clip(hsv[:, :, 0], 0, 179)
        hue_adjusted_image = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        return hue_adjusted_image
    except Exception as e:
        print(f"Error in adjust_hue: {e}")
        sys.exit(1)

def apply_blur(image, blur_level):
    """
    اعمال افکت Blur به تصویر.
    blur_level: میزان تیرگی تصویر. مقادیر مثبت برای افزایش Blur.
    """
    try:
        if blur_level <= 0:
            return image
        ksize = int(blur_level)
        if ksize % 2 == 0:
            ksize += 1
        blurred = cv2.GaussianBlur(image, (ksize, ksize), 0)
        return blurred
    except Exception as e:
        print(f"Error in apply_blur: {e}")
        sys.exit(1)

def apply_vignette(image, vignette_strength):
    """
    اعمال افکت Vignette به تصویر.
    vignette_strength: میزان شدت افکت Vignette (0 تا 1).
    """
    try:
        rows, cols = image.shape[:2]
        if vignette_strength <= 0:
            return image
        kernel_x = cv2.getGaussianKernel(cols, cols / (vignette_strength * 2))
        kernel_y = cv2.getGaussianKernel(rows, rows / (vignette_strength * 2))
        kernel = kernel_y * kernel_x.T
        mask = kernel / kernel.max()
        vignette = np.copy(image)
        for i in range(3):
            vignette[:, :, i] = vignette[:, :, i] * mask
        return vignette.astype(np.uint8)
    except Exception as e:
        print(f"Error in apply_vignette: {e}")
        sys.exit(1)

def apply_skin_smooth(image, smooth_strength):
    """
    اعمال افکت Skin Smooth به تصویر.
    smooth_strength: میزان صاف‌سازی پوست (0 تا 1).
    """
    try:
        if smooth_strength <= 0:
            return image
        smooth_image = cv2.bilateralFilter(
            image,
            d=15,
            sigmaColor=75 * smooth_strength,
            sigmaSpace=75 * smooth_strength
        )
        return smooth_image
    except Exception as e:
        print(f"Error in apply_skin_smooth: {e}")
        sys.exit(1)

def apply_eye_brighten(image, face_landmarks, brighten_level):
    """
    اعمال افکت روشن‌سازی چشم‌ها.
    brighten_level: میزان روشن‌سازی چشم‌ها (0 تا 1).
    """
    try:
        if brighten_level <= 0:
            return image

        left_eye_indices = [33, 133, 160, 158, 144, 153, 154, 155, 173, 157, 158, 159, 160, 161, 246]
        right_eye_indices = [362, 263, 387, 385, 380, 373, 374, 380, 381, 382, 385, 387, 388, 389, 466]

        h, w, _ = image.shape
        for eye_indices in [left_eye_indices, right_eye_indices]:
            eye_points = []
            for idx in eye_indices:
                if idx >= len(face_landmarks.landmark):
                    continue
                pt = face_landmarks.landmark[idx]
                eye_points.append((int(pt.x * w), int(pt.y * h)))

            if not eye_points:
                continue

            mask = np.zeros_like(image)
            cv2.fillPoly(mask, [np.array(eye_points)], (255, 255, 255))
            eye_region = cv2.bitwise_and(image, image, mask=cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY))

            hsv = cv2.cvtColor(eye_region, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 2] = hsv[:, :, 2] * (1 + brighten_level)
            hsv[:, :, 2] = np.clip(hsv[:, :, 2], 0, 255)
            bright_eye = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

            image = cv2.addWeighted(image, 1, bright_eye, 1, 0)

        return image
    except Exception as e:
        print(f"Error in apply_eye_brighten: {e}")
        sys.exit(1)

def apply_teeth_whiten(image, face_landmarks, whiten_level):
    """
    اعمال افکت سفید کردن دندان‌ها.
    whiten_level: میزان سفید کردن دندان‌ها (0 تا 1).
    """
    try:
        if whiten_level <= 0:
            return image

        teeth_indices = list(range(0, 17)) + list(range(17, 33))

        h, w, _ = image.shape
        for teeth_indices_set in [teeth_indices]:
            teeth_points = []
            for idx in teeth_indices_set:
                if idx >= len(face_landmarks.landmark):
                    continue
                pt = face_landmarks.landmark[idx]
                teeth_points.append((int(pt.x * w), int(pt.y * h)))

            if not teeth_points:
                continue

            mask = np.zeros_like(image)
            cv2.fillPoly(mask, [np.array(teeth_points)], (255, 255, 255))
            teeth_region = cv2.bitwise_and(image, image, mask=cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY))

            hsv = cv2.cvtColor(teeth_region, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 2] = hsv[:, :, 2] * (1 + whiten_level)
            hsv[:, :, 2] = np.clip(hsv[:, :, 2], 0, 255)
            white_teeth = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

            image = cv2.addWeighted(image, 1, white_teeth, 1, 0)

        return image
    except Exception as e:
        print(f"Error in apply_teeth_whiten: {e}")
        sys.exit(1)

def apply_lipstick(image, face_landmarks, lipstick_level):
    """
    اعمال افکت لپ‌استیک به لب‌ها.
    lipstick_level: میزان اعمال لپ‌استیک (0 تا 1).
    """
    try:
        if lipstick_level <= 0:
            return image

        upper_lip_indices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
        lower_lip_indices = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291]

        h, w, _ = image.shape
        for lip_indices in [upper_lip_indices, lower_lip_indices]:
            lip_points = []
            for idx in lip_indices:
                if idx >= len(face_landmarks.landmark):
                    continue
                pt = face_landmarks.landmark[idx]
                lip_points.append((int(pt.x * w), int(pt.y * h)))

            if not lip_points:
                continue

            mask = np.zeros_like(image)
            cv2.fillPoly(mask, [np.array(lip_points)], (255, 255, 255))
            lip_region = cv2.bitwise_and(image, image, mask=cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY))

            hsv = cv2.cvtColor(lip_region, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 0] = 160  # تن قرمز
            hsv[:, :, 1] = 150  # Saturation بالا
            hsv[:, :, 2] = hsv[:, :, 2] * (1 + lipstick_level)
            hsv[:, :, 2] = np.clip(hsv[:, :, 2], 0, 255)
            lipstick_color = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

            image = cv2.addWeighted(image, 1, lipstick_color, 1, 0)

        return image
    except Exception as e:
        print(f"Error in apply_lipstick: {e}")
        sys.exit(1)

def apply_eyelash_enhance(image, face_landmarks, eyelash_level):
    """
    اعمال افکت افزایش حجم مژه‌ها.
    eyelash_level: میزان افزایش حجم مژه‌ها (0 تا 1).
    """
    try:
        if eyelash_level <= 0:
            return image

        left_eyelash_indices = [33, 7, 163, 144, 145, 153, 154, 155, 133]
        right_eyelash_indices = [362, 263, 387, 385, 380, 373, 374, 380, 381]

        h, w, _ = image.shape
        for eyelash_indices in [left_eyelash_indices, right_eyelash_indices]:
            eyelash_points = []
            for idx in eyelash_indices:
                if idx >= len(face_landmarks.landmark):
                    continue
                pt = face_landmarks.landmark[idx]
                eyelash_points.append((int(pt.x * w), int(pt.y * h)))

            if not eyelash_points:
                continue

            mask = np.zeros_like(image)
            cv2.polylines(mask, [np.array(eyelash_points)], False, (255, 255, 255), thickness=2)
            mask = cv2.dilate(mask, np.ones((3,3), np.uint8), iterations=1)

            eyelash_region = cv2.bitwise_and(image, image, mask=cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY))

            eyelash_enhanced = cv2.morphologyEx(
                eyelash_region,
                cv2.MORPH_CLOSE,
                np.ones((3,3), np.uint8),
                iterations=int(eyelash_level * 3)
            )
            image = cv2.addWeighted(image, 1, eyelash_enhanced, 1, 0)

        return image
    except Exception as e:
        print(f"Error in apply_eyelash_enhance: {e}")
        sys.exit(1)

def add_glasses(image, face_landmarks, glasses_image_path="glasses.png"):
    """
    افزودن عینک به صورت سوژه.
    glasses_image_path: مسیر تصویر عینک با پس‌زمینه شفاف (PNG).
    """
    try:
        if not glasses_image_path or not os.path.exists(glasses_image_path):
            print("Glasses image not found.")
            return image

        for face in [face_landmarks]:
            left_eye_indices = [33, 133, 160, 158, 144, 153, 154, 155, 173, 157, 158, 159, 160, 161, 246]
            right_eye_indices = [362, 263, 387, 385, 380, 373, 374, 380, 381, 382, 385, 387, 388, 389, 466]

            h, w, _ = image.shape

            # پیدا کردن Bounding Box چپ چشم
            left_eye_coords = []
            for idx in left_eye_indices:
                if idx >= len(face.landmarks.landmark):
                    continue
                pt = face.landmarks.landmark[idx]
                left_eye_coords.append((int(pt.x * w), int(pt.y * h)))
            if not left_eye_coords:
                continue
            left_x = min([pt[0] for pt in left_eye_coords])
            left_y = min([pt[1] for pt in left_eye_coords])
            left_wd = max([pt[0] for pt in left_eye_coords]) - left_x
            left_ht = max([pt[1] for pt in left_eye_coords]) - left_y

            # پیدا کردن Bounding Box راست چشم
            right_eye_coords = []
            for idx in right_eye_indices:
                if idx >= len(face.landmarks.landmark):
                    continue
                pt = face.landmarks.landmark[idx]
                right_eye_coords.append((int(pt.x * w), int(pt.y * h)))
            if not right_eye_coords:
                continue
            right_x = min([pt[0] for pt in right_eye_coords])
            right_y = min([pt[1] for pt in right_eye_coords])
            right_wd = max([pt[0] for pt in right_eye_coords]) - right_x
            right_ht = max([pt[1] for pt in right_eye_coords]) - right_y

            # محاسبه ابعاد و موقعیت عینک
            glasses_width = int(right_x + right_wd - left_x)
            aspect_ratio = 1.0
            glasses_height = int(glasses_width / aspect_ratio)

            glasses_img = cv2.imread(glasses_image_path, cv2.IMREAD_UNCHANGED)
            if glasses_img is None:
                print("Failed to load glasses image.")
                return image

            resized_glasses = cv2.resize(glasses_img, (glasses_width, glasses_height), interpolation=cv2.INTER_AREA)

            y1 = left_y - int(glasses_height * 0.5)
            y2 = y1 + glasses_height
            x1 = left_x
            x2 = x1 + glasses_width

            # جلوگیری از تجاوز از مرز
            if y1 < 0:
                y1 = 0
                y2 = glasses_height
            if x1 < 0:
                x1 = 0
                x2 = glasses_width
            if y2 > h:
                y2 = h
                y1 = h - glasses_height
            if x2 > w:
                x2 = w
                x1 = w - glasses_width

            if resized_glasses.shape[2] == 4:
                alpha_glasses = resized_glasses[:, :, 3] / 255.0
                alpha_image = 1.0 - alpha_glasses
                for c in range(3):
                    image[y1:y2, x1:x2, c] = (
                        alpha_glasses * resized_glasses[:, :, c] +
                        alpha_image * image[y1:y2, x1:x2, c]
                    )
            else:
                image[y1:y2, x1:x2] = resized_glasses

        return image
    except Exception as e:
        print(f"Error in add_glasses: {e}")
        sys.exit(1)

def apply_face_effects(image, face_landmarks, args):
    """
    اعمال افکت‌های خاص روی چهره بر اساس نقاط کلیدی تشخیص داده شده.
    """
    try:
        image = apply_effects_to_face(image, create_face_mask(image, face_landmarks), args, face_landmarks)
        return image
    except Exception as e:
        print(f"Error in apply_face_effects: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Apply multiple effects to the subject.')
    parser.add_argument('input', type=str, help='Input image path (PNG with transparency)')
    parser.add_argument('output', type=str, help='Output image path')
    parser.add_argument('--blackWhiteLevel', type=float, default=0.2, help='Black and white effect intensity (0 to 1)')
    parser.add_argument('--posterizeBits', type=int, default=4, help='Number of bits for posterize (1 to 8)')
    parser.add_argument('--contrastFactor', type=float, default=1.0, help='Contrast adjustment factor (>1 to increase, <1 to decrease)')
    parser.add_argument('--overlayAlpha', type=float, default=0.5, help='Overlay alpha (0 to 1)')
    parser.add_argument('--blackLevel', type=float, default=0.2, help='Black level adjustment (0 to 1)')
    parser.add_argument('--whiteLevel', type=float, default=0.8, help='White level adjustment (0 to 1)')
    parser.add_argument('--faceEnhance', type=str, default='False', help='Enable Face Enhance effect (True/False)')
    parser.add_argument('--brightness', type=float, default=0.0, help='Brightness adjustment factor (-1 to 1)')
    parser.add_argument('--saturation', type=float, default=0.0, help='Saturation adjustment factor (-1 to 1)')
    parser.add_argument('--sharpness', type=float, default=0.0, help='Sharpness adjustment factor (-1 to 1)')
    parser.add_argument('--hue', type=float, default=0.0, help='Hue adjustment factor (-180 to 180)')
    parser.add_argument('--blur', type=float, default=0.0, help='Blur level (0 to 100)')
    parser.add_argument('--vignette', type=float, default=0.0, help='Vignette strength (0 to 1)')
    parser.add_argument('--skinSmooth', type=float, default=0.0, help='Skin smooth strength (0 to 1)')
    parser.add_argument('--eyeBrighten', type=float, default=0.0, help='Eye brightening level (0 to 1)')
    parser.add_argument('--teethWhiten', type=float, default=0.0, help='Teeth whitening level (0 to 1)')
    parser.add_argument('--lipstick', type=float, default=0.0, help='Lipstick level (0 to 1)')
    parser.add_argument('--eyelashEnhance', type=float, default=0.0, help='Eyelash enhancement level (0 to 1)')
    parser.add_argument('--addGlasses', type=str, default='False', help='Add glasses to the face (True/False)')

    args = parser.parse_args()

    try:
        print("Reading input image...")
        image = cv2.imread(args.input, cv2.IMREAD_UNCHANGED)
        if image is None:
            print("Error: Could not read input image.")
            sys.exit(1)
        print("Input image read successfully.")
    except Exception as e:
        print(f"Error reading input image: {e}")
        sys.exit(1)

    try:
        if image.shape[2] != 4:
            print("Error: Input image does not have an alpha channel.")
            sys.exit(1)
    except Exception as e:
        print(f"Error checking alpha channel: {e}")
        sys.exit(1)

    try:
        print("Separating channels...")
        bgr = image[:, :, :3]
        alpha_channel = image[:, :, 3]
    except Exception as e:
        print(f"Error separating channels: {e}")
        sys.exit(1)

    try:
        print("Detecting faces using Mediapipe FaceMesh...")
        mp_face_mesh = mp.solutions.face_mesh
        with mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=10,
            refine_landmarks=True,
            min_detection_confidence=0.3
        ) as face_mesh:
            results = face_mesh.process(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))

        faceEnhanceBool = (args.faceEnhance.lower() == 'true')
        if results.multi_face_landmarks and faceEnhanceBool:
            print(f"Detected {len(results.multi_face_landmarks)} face(s). Applying face effects...")
            for face_landmark in results.multi_face_landmarks:
                bgr = apply_face_effects(bgr, face_landmark, args)
        else:
            print("No faces detected for facial effects or faceEnhance is False.")
    except Exception as e:
        print(f"Error processing face landmarks: {e}")
        sys.exit(1)

    # اعمال افکت‌های عمومی
    try:
        print("Applying black and white effect...")
        bw_image = blend_with_grayscale(bgr, args.blackWhiteLevel)

        print("Applying posterize effect...")
        posterized_image = posterize(bw_image, args.posterizeBits)

        print("Adjusting contrast...")
        contrasted_image = adjust_contrast(posterized_image, args.contrastFactor)

        print("Applying overlay...")
        overlayed_image = apply_overlay(contrasted_image, args.overlayAlpha, color=(0, 0, 0))

        # اعمال blackLevel و whiteLevel در صورت نیاز (در حال حاضر پیاده نشده).

        # Brightness
        overlayed_image = adjust_brightness(overlayed_image, args.brightness)
        # Saturation
        overlayed_image = adjust_saturation(overlayed_image, args.saturation)
        # Sharpness
        overlayed_image = adjust_sharpness(overlayed_image, args.sharpness)
        # Hue
        overlayed_image = adjust_hue(overlayed_image, args.hue)
        # Blur
        overlayed_image = apply_blur(overlayed_image, args.blur)
        # Vignette
        overlayed_image = apply_vignette(overlayed_image, args.vignette)
        # Skin Smooth
        overlayed_image = apply_skin_smooth(overlayed_image, args.skinSmooth)

        final_bgr = overlayed_image
    except Exception as e:
        print(f"Error applying effects: {e}")
        sys.exit(1)

    # ترکیب با کانال آلفا
    try:
        print("Combining with alpha channel...")
        final_image = cv2.cvtColor(final_bgr, cv2.COLOR_BGR2BGRA)
        final_image[:, :, 3] = alpha_channel
    except Exception as e:
        print(f"Error combining with alpha channel: {e}")
        sys.exit(1)

    # (جدید) مرحلهٔ پس‌پردازش روی کانال آلفا برای رفع نویز لبه‌ها
    try:
        print("Post-processing alpha channel (removing noise on edges)...")

        # جدا کردن کانال آلفا
        alpha = final_image[:, :, 3]

        # روش 1: Morphological Close با یک کرنل 3x3
        kernel = np.ones((3, 3), np.uint8)
        alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, kernel, iterations=1)

        # (اختیاری) اگر خواستید کمی نرم‌تر شود:
        # alpha = cv2.GaussianBlur(alpha, (3,3), 0)

        # برگرداندن آلفا به تصویر
        final_image[:, :, 3] = alpha
    except Exception as e:
        print(f"Error in alpha post-processing step: {e}")
        sys.exit(1)

    # ذخیرهٔ فایل خروجی
    try:
        print("Saving output image...")
        cv2.imwrite(args.output, final_image)
        print("Output image saved successfully.")
    except Exception as e:
        print(f"Error saving output image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
