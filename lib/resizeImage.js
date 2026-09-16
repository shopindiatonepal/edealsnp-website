// Shrinks an image in the browser before it's ever sent to the server.
// Vercel rejects any request over ~4.5MB before our code even runs, and
// photos straight from a phone camera are very often bigger than that —
// this keeps every upload well under that limit regardless of the original
// file size, so that specific failure can't happen again.
export function resizeImageFile(file, maxDimension = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file); // not an image (shouldn't happen given our file inputs) — leave as-is
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        // Canvas is transparent by default. A transparent PNG drawn onto it
        // and then exported as JPEG (no alpha support) turns every
        // transparent pixel black instead of leaving it white — filling the
        // canvas white first fixes that for any image with transparency.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => resolve(file); // fall back to the original rather than block the upload
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
