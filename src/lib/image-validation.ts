const IMAGE_ERROR = "Images must be 8-bit RGB/RGBA PNG or baseline JPEG. Progressive JPEG, grayscale, CMYK, and HEIC are not supported.";

export function validateImageBytes(bytes: Uint8Array, mimeType: string): void {
  const fail = () => { throw new Error(IMAGE_ERROR); };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mimeType === "image/png") {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (bytes.length < 33 || !signature.every((value, index) => bytes[index] === value) ||
      view.getUint32(8) !== 13 ||
      String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR" ||
      !view.getUint32(16) || !view.getUint32(20) ||
      bytes[24] !== 8 || (bytes[25] !== 2 && bytes[25] !== 6) ||
      bytes[26] !== 0 || bytes[27] !== 0 || bytes[28] > 1) fail();
    return;
  }
  if (mimeType !== "image/jpeg" || bytes[0] !== 0xff || bytes[1] !== 0xd8) fail();
  let offset = 2;
  let baseline = false;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) fail();
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) break;
    if (offset + 2 > bytes.length) fail();
    const length = view.getUint16(offset);
    if (length < 2 || offset + length > bytes.length) fail();
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (marker !== 0xc0 || baseline || length !== 17 ||
        bytes[offset + 2] !== 8 || !view.getUint16(offset + 3) ||
        !view.getUint16(offset + 5) || bytes[offset + 7] !== 3) fail();
      baseline = true;
    }
    if (marker === 0xda) {
      if (!baseline) fail();
      return;
    }
    offset += length;
  }
  fail();
}

export async function validateImageFile(file: File): Promise<void> {
  validateImageBytes(new Uint8Array(await file.arrayBuffer()), file.type.toLowerCase());
  const bitmap = await createImageBitmap(file);
  bitmap.close();
}
