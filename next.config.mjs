/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Desactive la verification ESLint lors du build si besoin
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Desactive les erreurs TypeScript bloquantes au niveau du linter Next si besoin
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
