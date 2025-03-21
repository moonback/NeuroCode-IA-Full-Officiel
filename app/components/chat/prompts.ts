export const EXAMPLE_PROMPTS = [
  {
    id: 'vite-ecommerce',
    text: 'Crée une landing page e-commerce avec Vite + React, incluant un hero animé, une grille de produits, un panier dynamique et une intégration de paiement Stripe.',
    ariaLabel: 'Vite E-commerce Landing'
  },
  {
    id: 'astro-portfolio',
    text: 'Développe une landing page portfolio avec Astro, optimisée pour les images, avec galerie de projets, intégration MDX pour le blog, et animations fluides.',
    ariaLabel: 'Astro Portfolio Landing'
  },
  {
    id: 'vite-saas',
    text: 'Construis une landing page SaaS moderne avec Vite + Vue.js, dashboard interactif, authentification, et système de tarification dynamique.',
    ariaLabel: 'Vite SaaS Landing'
  },
  {
    id: 'astro-startup',
    text: 'Crée une landing page startup avec Astro, sections features animées, témoignages clients, blog intégré et formulaire de contact.',
    ariaLabel: 'Astro Startup Landing'
  },
  {
    id: 'vite-agency',
    text: 'Développe une landing page agence créative avec Vite + React, animations scroll, galerie de projets filtrable et formulaire de devis.',
    ariaLabel: 'Vite Agency Landing'
  },
  {
    id: 'astro-event',
    text: 'Construis une landing page événementielle avec Astro, compteur, agenda dynamique, inscription et galerie photos optimisée.',
    ariaLabel: 'Astro Event Landing'
  },
  {
    id: 'vite-product',
    text: 'Crée une landing page produit tech avec Vite + Vue.js, démo interactive, comparatif fonctionnalités et intégration analytics.',
    ariaLabel: 'Vite Product Landing'
  },
  {
    id: 'astro-course',
    text: 'Développe une landing page formation en ligne avec Astro, preview des cours, système d\'inscription et témoignages vidéo.',
    ariaLabel: 'Astro Course Landing'
  },
  {
    id: 'vite-app',
    text: 'Construis une landing page application mobile avec Vite + React, mockups animés, démonstration features et téléchargement app.',
    ariaLabel: 'Vite App Landing'
  },
  {
    id: 'astro-service',
    text: 'Crée une landing page service digital avec Astro, présentation interactive des services, calculateur de prix et chat support.',
    ariaLabel: 'Astro Service Landing'
  }
];

export type Prompt = typeof EXAMPLE_PROMPTS[number];
