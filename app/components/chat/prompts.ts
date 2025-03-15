export const EXAMPLE_PROMPTS = [
  {
    id: 'saas-landing',
    text: 'Create a SaaS landing page with hero section, features grid, pricing table, testimonials, and CTA sections. Include scroll animations and SEO optimization.',
    ariaLabel: 'SaaS Landing'
  },
  {
    id: 'startup-landing',
    text: 'Design a startup landing page with animated hero, metrics dashboard, customer success stories, and feature highlights. Add analytics integration.',
    ariaLabel: 'Startup Landing'
  },
  {
    id: 'product-landing',
    text: 'Build a product landing page with interactive demo, pricing comparison, mobile-first design, and secure checkout integration.',
    ariaLabel: 'Product Landing'
  },
  {
    id: 'agency-landing',
    text: 'Design an agency landing page with interactive portfolio, smooth animations, contact form, and case studies section.',
    ariaLabel: 'Agency Landing'
  },
  {
    id: 'event-landing',
    text: 'Create an event landing page with countdown timer, registration form, schedule display, and speaker showcase section.',
    ariaLabel: 'Event Landing'
  }
];

export type Prompt = typeof EXAMPLE_PROMPTS[number];
