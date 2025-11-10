# FeryyDevv Deploy Portal

Files:
- index.html (frontend upload UI)
- style.css
- script.js
- api/deploy.js (serverless function for Vercel)
- package.json
- vercel.json

## Quick setup
1. Create a new project in Vercel and connect your Git repository or upload this project.
2. Add Environment Variable `VERCEL_TOKEN` in the Vercel Project settings with your token (No expiration recommended).
3. Deploy the project on Vercel.
4. Open the site, select a ZIP (build output) and click **Upload & Deploy**.
5. If you provided a custom domain, add it in Vercel dashboard and update DNS as instructed.

Security: do not commit your token to repository. Use Vercel Environment Variables.
