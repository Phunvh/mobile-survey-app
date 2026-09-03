import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 2; // Color type: 2 (Truecolor / RGB)
  ihdrData[10] = 0; // Compression: deflate
  ihdrData[11] = 0; // Filter: standard
  ihdrData[12] = 0; // Interlace: none

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines (Filter byte 0 + RGB for each pixel)
  const lineSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * lineSize);

  for (let y = 0; y < height; y++) {
    const lineOffset = y * lineSize;
    rawData[lineOffset] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = lineOffset + 1 + x * 3;
      // create a subtle gradient or nice survey icon background
      const grad = Math.floor((y / height) * 30);
      rawData[pixelOffset] = Math.max(0, r - grad);     // Red
      rawData[pixelOffset + 1] = Math.max(0, g - grad); // Green
      rawData[pixelOffset + 2] = Math.max(0, b - grad); // Blue
    }
  }

  const idatCompressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatCompressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

// CRC32 implementation
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    crc32.table = table;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons in public/
fs.writeFileSync('./public/pwa-192x192.png', createPNG(192, 192, 37, 99, 235)); // #2563eb
fs.writeFileSync('./public/pwa-512x512.png', createPNG(512, 512, 30, 64, 175)); // #1e40af
fs.writeFileSync('./public/apple-touch-icon.png', createPNG(180, 180, 37, 99, 235));

console.log('Successfully generated PWA PNG icons!');
