This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on GitHub Pages

This project is configured to deploy as a static Next.js export (`output: "export"`).

### 1) Push to GitHub

Push this project to your repository (example: `https://github.com/<user>/<repo>`).

### 2) Enable Pages in repository settings

- Open repository **Settings** → **Pages**
- In **Build and deployment**, choose **Source: GitHub Actions**

### 3) Deployment workflow

A workflow file at `.github/workflows/deploy.yml` builds and deploys automatically on push to `main`.

### Notes

- For project repositories (`<user>.github.io/<repo>`), base path is configured automatically in GitHub Actions.
- For user/org root sites (`<user>.github.io`), no base path is used.
- Add repository variable `NEXT_PUBLIC_API_URL` (Settings → Secrets and variables → Actions → Variables) with your backend URL.
- GitHub Pages only hosts static files, so server-only Next.js features are not supported.
