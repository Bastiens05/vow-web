import { deflateSync } from "node:zlib";

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, checksum]);
}

export function renderPortfolioPng(width: number, height: number, variant: number): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y, width, height, variant);
      const index = row + 1 + x * 3;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function pixel(x: number, y: number, width: number, height: number, variant: number): [number, number, number] {
  const nx = x / width;
  const ny = y / height;
  const base: [number, number, number] = variant === 0 ? [236, 226, 210] : variant === 1 ? [214, 196, 176] : [186, 170, 154];
  const gold: [number, number, number] = [197, 160, 89];
  const ink: [number, number, number] = [28, 22, 18];
  const band = Math.abs(ny - (0.35 + variant * 0.12)) < 0.015;
  const cx = 0.32 + variant * 0.18;
  const cy = 0.48;
  const dx = (nx - cx) * (width / height);
  const dy = ny - cy;
  const circle = dx * dx + dy * dy < 0.06;
  const ring = dx * dx + dy * dy < 0.075 && !circle;
  if (band || ring) return gold;
  if (circle) return ink;
  const shade = Math.round((nx * 18 + ny * 10) * (variant + 1));
  return [
    clamp(base[0] - shade),
    clamp(base[1] - shade),
    clamp(base[2] - shade),
  ];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, value));
}
