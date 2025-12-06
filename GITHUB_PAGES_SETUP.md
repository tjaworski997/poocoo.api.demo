# 🚀 GitHub Pages Setup Instructions

## Automatic Setup (Recommended)

The repository is already configured for automatic deployment! Just follow these steps:

### Step 1: Enable GitHub Pages

1. Go to your repository: [https://github.com/tjaworski997/poocoo.api.demo](https://github.com/tjaworski997/poocoo.api.demo)
2. Click on **Settings** (top menu)
3. In the left sidebar, click **Pages**
4. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - (It should automatically detect the workflow file)

### Step 2: Wait for Deployment

1. Go to the **Actions** tab in your repository
2. You should see a workflow run called "Deploy to GitHub Pages"
3. Wait for it to complete (usually takes 1-2 minutes)
4. Once it's done with a green checkmark ✅, your site is live!

### Step 3: Access Your Live Demo

Your demo will be available at:
**https://tjaworski997.github.io/poocoo.api.demo/**

---

## Manual Verification

To check if GitHub Pages is enabled:

```bash
# Check the deployment status
curl -I https://tjaworski997.github.io/poocoo.api.demo/
```

If you get a 200 OK response, your site is live! 🎉

---

## Troubleshooting

### If the workflow doesn't run automatically:

1. Go to repository **Settings** → **Actions** → **General**
2. Under "Workflow permissions":
   - Enable "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"
3. Click **Save**
4. Go to **Actions** tab and manually trigger the workflow:
   - Click on "Deploy to GitHub Pages"
   - Click "Run workflow" → "Run workflow"

### If you see a 404 error:

1. Make sure GitHub Pages source is set to "GitHub Actions"
2. Check that the workflow completed successfully in the Actions tab
3. Wait a few minutes - it can take up to 10 minutes for DNS to propagate

### If the page loads but looks broken:

- Check browser console for errors
- Verify all file paths are correct (case-sensitive!)
- Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## Custom Domain (Optional)

If you want to use a custom domain like `demo.poocoo.pl`:

1. Create a `CNAME` file in the root with your domain:
   ```
   demo.poocoo.pl
   ```

2. Add DNS records in your domain provider:
   ```
   Type: CNAME
   Name: demo
   Value: tjaworski997.github.io
   ```

3. Enable "Enforce HTTPS" in GitHub Pages settings

---

## Files Created for GitHub Pages

- `.github/workflows/deploy.yml` - Automatic deployment workflow
- `.nojekyll` - Tells GitHub not to process files with Jekyll
- `README.md` - SEO-optimized documentation
- `imgs/` - Screenshots and logo

---

## Next Steps

Once your GitHub Pages is live:

1. ✅ Update the live demo link in your README if needed
2. ✅ Share the link: `https://tjaworski997.github.io/poocoo.api.demo/`
3. ✅ Test all features to make sure everything works
4. ✅ Monitor the site using Google Search Console (optional)
5. ✅ Add the demo link to your main poocoo.pl website

---

## Monitoring & Analytics (Optional)

To track visitors, you can add Google Analytics:

1. Get your GA4 tracking ID
2. Add this to `<head>` in `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

🎉 **Your demo is now ready for the world!**
