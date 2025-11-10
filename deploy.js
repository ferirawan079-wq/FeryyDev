// api/deploy.js - CommonJS style for Vercel serverless
// Requires environment variable VERCEL_TOKEN set in Vercel Project settings.
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');
  const token = process.env.VERCEL_TOKEN;
  if (!token) return res.status(500).send('VERCEL_TOKEN not configured in Environment Variables.');

  try {
    const { projectName, customDomain, projectSlug, filename, zipBase64 } = req.body || {};
    if (!zipBase64) return res.status(400).send('Missing zipBase64');

    const zipBuffer = Buffer.from(zipBase64, 'base64');
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries().filter(e => !e.isDirectory);
    if (entries.length === 0) return res.status(400).send('Zip kosong atau tidak ada file untuk dideploy.');

    const uploadedFiles = [];
    // Upload each file to Vercel files endpoint
    for (const entry of entries) {
      const filePath = entry.entryName;
      const content = entry.getData();
      const sha = crypto.createHash('sha1').update(filePath).digest('hex');

      const uploadResp = await fetch('https://api.vercel.com/v2/now/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-vercel-digest': sha,
          'Content-Type': 'application/octet-stream'
        },
        body: content
      });

      if (!uploadResp.ok) {
        const txt = await uploadResp.text().catch(()=> '');
        throw new Error(`Gagal upload ${filePath}: ${uploadResp.status} ${txt}`);
      }
      uploadedFiles.push({ file: filePath, sha, size: content.length });
    }

    // Create deployment
    const deployBody = { name: projectName || 'feryydevv-site', files: uploadedFiles, projectSettings: { framework: null } };
    if (projectSlug) deployBody.project = projectSlug;

    const deployResp = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(deployBody)
    });

    if (!deployResp.ok) {
      const txt = await deployResp.text().catch(()=> '');
      throw new Error('Create deployment failed: ' + deployResp.status + ' ' + txt);
    }
    const deployJson = await deployResp.json();
    const url = deployJson.url ? `https://${deployJson.url}` : (deployJson.previewUrl ? `https://${deployJson.previewUrl}` : null);

    // Try aliasing custom domain if provided
    let aliasMessage = null;
    if (customDomain) {
      try {
        if (deployJson.id) {
          const aliasResp = await fetch('https://api.vercel.com/v2/aliases', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ deploymentId: deployJson.id, alias: customDomain })
          });
          if (aliasResp.ok) {
            aliasMessage = 'Custom domain alias requested. Jika DNS diarahkan, domain akan aktif setelah verifikasi.';
          } else {
            const txt = await aliasResp.text().catch(()=>'');
            aliasMessage = `Alias request gagal: ${aliasResp.status} ${txt}`;
          }
        } else {
          aliasMessage = 'Deployment id tidak tersedia; alias tidak dibuat.';
        }
      } catch (e) {
        aliasMessage = 'Alias error: ' + String(e.message || e);
      }
    }

    return res.status(200).json({ url: url || 'unknown', aliasMessage });
  } catch (err) {
    console.error('deploy error', err);
    return res.status(500).send(String(err.message || err));
  }
};
