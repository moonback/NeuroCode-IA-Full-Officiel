export const EXAMPLE_PROMPTS = [
  {
    id: 'saas-landing',
    text: 'Concevoir une landing page SaaS hautement performante avec animations scroll-driven fluides, sections interactives optimisées pour le SEO, et chargement ultra-rapide grâce à des techniques de lazy loading et de cache intelligent',
    ariaLabel: 'Landing SaaS'
  },
  {
    id: 'startup-landing',
    text: 'Développer une landing page startup avec une hero section dynamique et responsive, intégration de métriques en temps réel, témoignages clients animés, et système de tracking analytique complet',
    ariaLabel: 'Landing Startup'
  },
  {
    id: 'product-landing',
    text: 'Créer une landing page produit avec démo interactive en temps réel, comparatifs de prix dynamiques, tunnel de conversion optimisé pour le mobile, et intégration de paiement sécurisé',
    ariaLabel: 'Landing Produit'
  },
  {
    id: 'agency-landing',
    text: 'Concevoir une landing page agence avec portfolio dynamique et interactif, animations fluides basées sur WebGL, formulaire de contact intelligent avec validation en temps réel, et intégration de chatbot IA',
    ariaLabel: 'Landing Agence'
  },
  {
    id: 'event-landing',
    text: 'Développer une landing page événement avec compte à rebours interactif, système d\'inscription simplifié avec validation instantanée, intégration de calendrier intelligent, et notifications push personnalisées',
    ariaLabel: 'Landing Événement'
  },
  
];

export type Prompt = typeof EXAMPLE_PROMPTS[number];
