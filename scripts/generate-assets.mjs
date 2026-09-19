import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const svgPath = path.join(publicDir, 'favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

// Helper to create a Windows .ico binary buffer from multiple PNG buffers
function createIco(pngBuffers) {
  // ICO Header: 6 bytes
  // 0-1: Reserved (0)
  // 2-3: Type (1 for ICO)
  // 4-5: Number of images
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  // Directory entries: 16 bytes per image
  const dirSize = 16 * numImages;
  const dir = Buffer.alloc(dirSize);

  let offset = 6 + dirSize;
  const entries = [];

  for (let i = 0; i < numImages; i++) {
    const { buffer, width, height } = pngBuffers[i];
    const size = buffer.length;

    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);   // Width
    entry.writeUInt8(height >= 256 ? 0 : height, 1); // Height
    entry.writeUInt8(0, 2);                          // Color palette count
    entry.writeUInt8(0, 3);                          // Reserved
    entry.writeUInt16LE(1, 4);                       // Color planes
    entry.writeUInt16LE(32, 6);                      // Bits per pixel
    entry.writeUInt32LE(size, 8);                    // Image data size
    entry.writeUInt32LE(offset, 12);                 // Offset of image data

    entry.copy(dir, i * 16);
    offset += size;
  }

  return Buffer.concat([header, dir, ...pngBuffers.map(p => p.buffer)]);
}

async function generateAssets() {
  console.log('Generating website visual and technical assets...');

  // 1. Generate PNG sizes for ICO
  const icoSizes = [16, 32, 48];
  const icoPngs = [];
  for (const size of icoSizes) {
    const buf = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    icoPngs.push({ buffer: buf, width: size, height: size });
  }
  const icoBuffer = createIco(icoPngs);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log('✓ Created public/favicon.ico (16x16, 32x32, 48x48)');

  // 2. Apple Touch Icon (180x180)
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created public/apple-touch-icon.png (180x180)');

  // 3. PWA Icons (192x192, 512x512)
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Created public/icon-192.png (192x192)');

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Created public/icon-512.png (512x512)');

  // 4. Maskable PWA Icon with padding
  const maskableSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#1e1108" />
    <g transform="translate(64, 64) scale(0.75)">
      ${svgBuffer.toString().replace(/<\?xml.*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
    </g>
  </svg>
  `;
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(publicDir, 'icon-maskable-512.png'));
  console.log('✓ Created public/icon-maskable-512.png (512x512)');

  // 5. OpenGraph & Twitter Social Card Image (1200x630)
  const ogSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1b1108" />
        <stop offset="50%" stop-color="#2a180c" />
        <stop offset="100%" stop-color="#0f0703" />
      </linearGradient>
      <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="40%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#ea580c" />
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#d97724" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
      <linearGradient id="woodBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d97724" />
        <stop offset="50%" stop-color="#78350f" />
        <stop offset="100%" stop-color="#d97724" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)" />
    <circle cx="950" cy="315" r="380" fill="url(#glow)" />
    <rect x="20" y="20" width="1160" height="590" rx="24" fill="none" stroke="url(#woodBorder)" stroke-width="4" stroke-opacity="0.6" />

    <!-- Left Content / Typography -->
    <g transform="translate(80, 110)">
      <!-- Badge -->
      <rect x="0" y="0" width="280" height="38" rx="19" fill="#3d2212" stroke="#f59e0b" stroke-width="2" />
      <text x="140" y="24" fill="#fbbf24" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" text-anchor="middle">🪵 #1 WOODY BALL PUZZLE</text>

      <!-- Main Title -->
      <text x="0" y="95" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="900" letter-spacing="-1">Woody Sort Game</text>
      <text x="0" y="160" fill="url(#goldText)" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800">Color Sort Puzzle</text>

      <!-- Description -->
      <text x="0" y="220" fill="#fed7aa" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="400">Relaxing rustic wood tubes, vibrant color spheres &amp; smart AI hints.</text>
      <text x="0" y="255" fill="#a8a29e" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="400">100+ Levels • Free Online • No Download Required</text>

      <!-- Feature Pill Tags -->
      <g transform="translate(0, 310)">
        <rect x="0" y="0" width="170" height="42" rx="10" fill="#2d1a0e" stroke="#78350f" stroke-width="1.5" />
        <text x="85" y="26" fill="#fde68a" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle">✨ Free Web Play</text>

        <rect x="185" y="0" width="180" height="42" rx="10" fill="#2d1a0e" stroke="#78350f" stroke-width="1.5" />
        <text x="275" y="26" fill="#fde68a" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle">🗝️ Hidden Levels</text>

        <rect x="380" y="0" width="180" height="42" rx="10" fill="#2d1a0e" stroke="#78350f" stroke-width="1.5" />
        <text x="470" y="26" fill="#fde68a" font-family="system-ui, sans-serif" font-size="16" font-weight="600" text-anchor="middle">🧠 Brain Workout</text>
      </g>
    </g>

    <!-- Right Side Icon Illustration -->
    <g transform="translate(760, 115) scale(0.8)">
      ${svgBuffer.toString().replace(/<\?xml.*?\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
    </g>
  </svg>
  `;

  await sharp(Buffer.from(ogSvg)).jpeg({ quality: 90 }).toFile(path.join(publicDir, 'og-woody-sort.jpg'));
  console.log('✓ Created public/og-woody-sort.jpg (1200x630)');
  await sharp(Buffer.from(ogSvg)).png().toFile(path.join(publicDir, 'og-image.png'));
  console.log('✓ Created public/og-image.png (1200x630)');

  console.log('All visual assets generated successfully!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
