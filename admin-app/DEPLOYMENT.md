# QYan Admin App - Deployment Instructions

## Quick Deployment Checklist

Follow this exact sequence every time you deploy the admin app:

### 1. Update Version (if needed)
```powershell
cd c:\Projects\quiz-engine
# Edit package.json to bump version number (e.g., 1.0.48 -> 1.0.49)
npm run inject-version
```

**✓ Verify**: Output shows `✓ Version updated to vX.X.XX in public/index.html`

### 2. Stage & Commit Changes
```powershell
git add -A
git commit -m "brief description of changes"
```

### 3. Build Admin App
```powershell
cd admin-app
npm run build
```

**✓ Verify**: Output must show `✓ built in X.XXs` with **no TypeScript errors**  
**✗ If build fails**: Fix TypeScript errors before proceeding

### 4. Deploy to Firebase (qyan-om)
```powershell
firebase deploy --project qyan-om --only hosting
```

**✓ Verify**: Output shows `Deploy complete!` and `Hosting URL: https://qyan-om.web.app`

### 5. Push to GitHub
```powershell
cd ..
git push
```

---

## Full Command Sequence (Copy-Paste Ready)

```powershell
# From repo root: c:\Projects\quiz-engine
# 1. Update version in package.json if needed, then:
npm run inject-version
git add -A
git commit -m "your change description here"
cd admin-app
npm run build
firebase deploy --project qyan-om --only hosting
cd ..
git push
```

---

## Project Structure

- **Admin App**: `c:\Projects\quiz-engine\admin-app`
  - Firebase Project: `qyan-om`
  - Live URL: https://qyan-om.web.app
  - Build output: `admin-app/dist/`
  - Framework: Vite + React + TypeScript

- **Game Server**: `c:\Projects\quiz-engine` (repo root)
  - Firebase Project: `legacy` (quizengine-e7818)
  - Files: `public/`, `server/`
  - Deployment: Render.com (auto-deploys from GitHub main branch)

---

## Common Issues

### Build fails with TypeScript errors
- **Fix**: Address all `error TS` lines before deploying
- **Example**: Remove unused variables, fix type mismatches

### Firebase deploy fails with "Not in a Firebase app directory"
- **Fix**: Ensure you're in `admin-app/` folder (run `cd admin-app`)
- **Check**: `firebase.json` exists in current directory

### Git push rejected
- **Fix**: Pull latest changes first: `git pull --rebase`
- Then retry: `git push`

---

## Notes

- Always **build before deploy** - Firebase deploys the `dist/` folder
- Admin app changes **only** affect `qyan-om` project
- Game server (public/server) auto-deploys via Render when you push to GitHub
- Keep commit messages clear and concise
