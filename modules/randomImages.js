import { randomImageSources as generatedImageSources } from './generatedImageList.js';

const RANDOM_DIR = '/modules/assets/random';
const MANIFEST_PATH = `${RANDOM_DIR}/manifest.json`;
const IMAGE_EXT_PATTERN = /\.(jpg|jpeg|png|gif|webp|avif)$/i;
const DEFAULT_REPO = {
  owner: 'autumngreenbean',
  repo: 'portfolio',
  branch: 'gh-pages',
};

let cachedSources = [];
let loadPromise = null;

function normalizeManifestEntries(entries) {
  if (!Array.isArray(entries)) return [];

  return entries
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry && IMAGE_EXT_PATTERN.test(entry))
    .map((entry) => (entry.startsWith('/') || entry.startsWith('http') ? entry : `${RANDOM_DIR}/${entry}`));
}

function uniqueEntries(entries) {
  return [...new Set(entries.filter(Boolean))];
}

async function fetchManifestSources() {
  const response = await fetch(`${MANIFEST_PATH}?t=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Manifest fetch failed: ${response.status}`);
  }

  const manifest = await response.json();
  return normalizeManifestEntries(manifest);
}

function readRepoConfig() {
  if (typeof window !== 'undefined' && window.RANDOM_IMAGES_REPO) {
    const { owner, repo, branch } = window.RANDOM_IMAGES_REPO;
    if (owner && repo) {
      return {
        owner,
        repo,
        branch: branch || DEFAULT_REPO.branch,
      };
    }
  }

  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="random-images-repo"]');
    if (meta?.content) {
      const [repoRef, branchRef] = meta.content.split('@');
      const [owner, repo] = repoRef.split('/');
      if (owner && repo) {
        return {
          owner,
          repo,
          branch: branchRef || DEFAULT_REPO.branch,
        };
      }
    }
  }

  if (typeof location !== 'undefined' && location.hostname.endsWith('github.io')) {
    const owner = location.hostname.split('.')[0];
    const repo = location.pathname.split('/').filter(Boolean)[0];
    if (owner && repo) {
      return {
        owner,
        repo,
        branch: DEFAULT_REPO.branch,
      };
    }
  }

  return DEFAULT_REPO;
}

async function fetchGithubSources() {
  const { owner, repo, branch } = readRepoConfig();
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/modules/assets/random?ref=${branch}`;
  const response = await fetch(endpoint, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`GitHub API fetch failed: ${response.status}`);
  }

  const files = await response.json();
  if (!Array.isArray(files)) return [];

  return files
    .filter((file) => file?.type === 'file' && IMAGE_EXT_PATTERN.test(file.name || ''))
    .map((file) => file.download_url || `${RANDOM_DIR}/${file.name}`);
}

function readBundledSources() {
  const imageModules =
    typeof import.meta !== 'undefined' && typeof import.meta.glob === 'function'
      ? import.meta.glob('/modules/assets/random/*.{jpg,jpeg,png,gif,webp,avif}', {
          eager: true,
          import: 'default',
        })
      : {};

  return Object.values(imageModules)
    .filter(Boolean)
    .map((src) => String(src));
}

async function loadSources({ forceRefresh = false } = {}) {
  if (cachedSources.length && !forceRefresh) {
    return cachedSources;
  }

  if (loadPromise && !forceRefresh) {
    return loadPromise;
  }

  loadPromise = (async () => {
    let sources = [];
    let githubSources = [];
    let manifestSources = [];

    try {
      githubSources = await fetchGithubSources();
    } catch (error) {
      console.info('randomImages: GitHub API unavailable, trying manifest and bundled sources.', error);
    }

    try {
      manifestSources = await fetchManifestSources();
    } catch (error) {
      console.info('randomImages: manifest unavailable, using other sources.', error);
    }

    sources = uniqueEntries([...githubSources, ...manifestSources]);

    if (!sources.length) {
      sources = readBundledSources();
    }

    if (!sources.length) {
      sources = generatedImageSources;
    }

    cachedSources = uniqueEntries(sources);
    return cachedSources;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export async function refreshRandomImageSources() {
  return loadSources({ forceRefresh: true });
}

export async function getRandomImageSources() {
  return loadSources();
}

export async function getRandomImageSource() {
  const sources = await getRandomImageSources();

  if (!sources.length) {
    console.warn('No random images found from manifest, GitHub API, bundled assets, or generated list.');
    return '';
  }

  const randomIndex = Math.floor(Math.random() * sources.length);
  return sources[randomIndex];
}
