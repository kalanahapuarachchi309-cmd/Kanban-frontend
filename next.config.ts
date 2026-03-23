import type { NextConfig } from "next";

const repository = process.env.GITHUB_REPOSITORY ?? "";
const [repositoryOwner, repositoryName] = repository.split("/");
const isUserOrOrgPageRepo = repositoryName === `${repositoryOwner}.github.io`;
const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH ??
  (process.env.GITHUB_ACTIONS && repositoryName && !isUserOrOrgPageRepo
    ? `/${repositoryName}`
    : "");

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
