import { readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const randomDir = join(__dirname, '../modules/assets/random');
const outputFile = join(__dirname, '../modules/generatedImageList.js');

try {
  const files = readdirSync(randomDir)
    .filter(file => {
      const ext = file.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext);
    })
    .map(file => `./modules/assets/random/${file}`);

  const content = `// Auto-generated file - do not edit manually
// Generated from modules/assets/random/
export const randomImageSources = ${JSON.stringify(files, null, 2)};

export function getRandomImageSource() {
  if (!randomImageSources.length) {
    return '';
  }
  const randomIndex = Math.floor(Math.random() * randomImageSources.length);
  return randomImageSources[randomIndex];
}
`;

  writeFileSync(outputFile, content, 'utf-8');
  console.log(`✓ Generated image list with ${files.length} images`);
} catch (error) {
  console.error('Error generating image list:', error);
  process.exit(1);
}
