/** @type {import("next").NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["fr", "en"],
    defaultLocale: "fr",
  },
  eslint: { ignoreDuringBuilds: process.env.CI !== undefined },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      extensionAlias: {
        ".js": [".ts", ".tsx", ".js", ".jsx"],
      },
    };
    return config;
  },
};

export default nextConfig;
