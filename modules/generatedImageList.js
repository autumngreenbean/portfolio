// Auto-generated file - do not edit manually
// Generated from modules/assets/random/
export const randomImageSources = [
  "./modules/assets/random/168c22fcc4f712f3eb11dc95ed8658cb.jpg",
  "./modules/assets/random/20aa7c6875baaaf8977abaaa93725664.jpg",
  "./modules/assets/random/20dd52f1f21f17f093aaf8c344b5af5f.jpg",
  "./modules/assets/random/213a61a9a4ff9cfdf1e18219cbbc0b41.jpg",
  "./modules/assets/random/2582bb9cfb3477f632b6ab9b0eaca497.jpg",
  "./modules/assets/random/2741300e9b3901ae598b89c87dff163d.jpg",
  "./modules/assets/random/2f9e8e09250e7924dcd97c609743f055.jpg",
  "./modules/assets/random/40c9f0e2e276a2efee9187a9574daa59.jpg",
  "./modules/assets/random/5742745d9c71b2ba637e7daf4d7c15fb.jpg",
  "./modules/assets/random/5973dbbeb1f7917b226c8286a3a15195.jpg",
  "./modules/assets/random/5dd4c035e238735c32e4eb409726141a.jpg",
  "./modules/assets/random/5fd9d22c2328806e8313119a038bccaf.gif",
  "./modules/assets/random/62f71f63e29d15f0d187ee8df19fcdb6.jpg",
  "./modules/assets/random/697a871aee1cc3fc14c871732923c868.gif",
  "./modules/assets/random/7907beb63cc6f7e7077d96d28590d773.jpg",
  "./modules/assets/random/80fa4657f830a186a6ece2f4200e15d1.jpg",
  "./modules/assets/random/8249bb0a0bd50fd9bfb94a1d28179ae0.jpg",
  "./modules/assets/random/9cbfad206a7bd3cf3ebc70c54f299a90.jpg",
  "./modules/assets/random/9fb26221777f4d9f6f3ea701f03a8ee9.jpg",
  "./modules/assets/random/a111c69784c4688ffff62df3a389781b.jpg",
  "./modules/assets/random/a318102e11e7218d7309b025b35e0894.jpg",
  "./modules/assets/random/a54a857667e508c898614aa1eed64861.jpg",
  "./modules/assets/random/b13a3409a41138dd300d7199319b2d62.gif",
  "./modules/assets/random/b4b193721e63c206a88228ee2e443636.gif",
  "./modules/assets/random/b5a1544629bece276a2dfa49cc801d45.jpg",
  "./modules/assets/random/be55a1de69f846bed4bb38e92e879b7b.jpg",
  "./modules/assets/random/d0e2f6823451da55d5883b40e3e3434f.jpg",
  "./modules/assets/random/d83c052952c75954bf23a29d860fcf31.jpg",
  "./modules/assets/random/f6270cb0bbe54ad1a7dc5417313c11ce.jpg"
];

export function getRandomImageSource() {
  if (!randomImageSources.length) {
    return '';
  }
  const randomIndex = Math.floor(Math.random() * randomImageSources.length);
  return randomImageSources[randomIndex];
}
