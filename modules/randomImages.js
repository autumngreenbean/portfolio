const imageModules = typeof import.meta !== 'undefined' && typeof import.meta.glob === 'function'
  ? import.meta.glob('/modules/assets/random/*.{jpg,jpeg,png,gif,webp,avif}', {
      eager: true,
      import: 'default',
    })
  : {};

export const randomImageSources = Object.values(imageModules)
  .filter(Boolean)
  .map((src) => String(src));

export function getRandomImageSource() {
  if (!randomImageSources.length) {
    console.warn('No random images found in /modules/assets/random. This must be served through Vite for import.meta.glob to work.');
    return '';
  }

  const randomIndex = Math.floor(Math.random() * randomImageSources.length);
  return randomImageSources[randomIndex];
}
