// Static export: `next build` writes plain files to out/, so the site needs no
// server (free on Vercel) and CI can serve out/ and run Astrolabe on it.
/** @type {import('next').NextConfig} */
const config = {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default config;
