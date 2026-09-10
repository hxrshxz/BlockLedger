/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Next does not pick up unrelated lockfiles
  // that may exist further up the filesystem.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
