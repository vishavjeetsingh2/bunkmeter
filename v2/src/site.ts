export const siteUrl = 'https://bunkmeter.online';
export const publicRoutes = ['/', '/about', '/contact', '/privacy-policy', '/terms', '/disclaimer'];
// Netlify previews must never become indexable, even when inheriting production variables.
export const productionRelease = import.meta.env.BUNKMETER_PRODUCTION === 'true'
  && (!import.meta.env.CONTEXT || import.meta.env.CONTEXT === 'production');
export const contactEmail = (import.meta.env.CONTACT_EMAIL ?? '').trim();
