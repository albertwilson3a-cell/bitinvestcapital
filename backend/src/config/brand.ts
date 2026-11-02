/**
 * Brand identity. Single source for the company name and domain used in
 * emails, CORS and token claims. Deployment-specific values (e.g. a staging
 * frontend URL) come from the environment; these are the production defaults.
 */
export const BRAND = {
  name: 'BitInvest Capital',
  domain: 'bitinvestcapital.com',
  websiteUrl: 'https://bitinvestcapital.com',
  supportEmail: 'support@bitinvestcapital.com',
  noReplyEmail: 'no-reply@bitinvestcapital.com',
} as const;
