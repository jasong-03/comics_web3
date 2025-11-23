
/**
 * Compresses a base64 image string by resizing and adjusting quality.
 * @param base64Str The input base64 image string
 * @param maxWidth Maximum width of the output image
 * @param quality JPEG quality (0 to 1)
 * @returns Promise resolving to the compressed base64 string
 */
export const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `data:image/jpeg;base64,${base64Str}`;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Get compressed base64 string (remove data:image/jpeg;base64, prefix)
            const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
            const compressedBase64 = compressedDataUrl.split(",")[1];
            resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
    });
};
