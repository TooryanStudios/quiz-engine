# deploy-readme

<small><strong>WorkHub v.002</strong></small>

Use this file for every release.

## Build Number Rule
1. Before each release, update the small line at the top: `WorkHub v.000`.
2. Keep 3 digits and increase by 1 each release.
3. Examples: `WorkHub v.001`, `WorkHub v.002`, `WorkHub v.003`.

## Correct Deployment Order (Do Not Change)
1. Update build number in this file.
2. Stage and commit changes.
3. Build the admin app.
4. Deploy hosting.
5. Push to GitHub.

## Standard Release Commands (Firebase Hosting)
Run these commands in this exact order:

```powershell
# 1) From repo root
cd C:\Projects\quiz-engine
git status --short
git add -A
git commit -m "release: WorkHub v.002"

# 2) Build in admin app
cd admin-app
npm run build

# 3) Deploy to Firebase hosting (qyan-om)
firebase deploy --project qyan-om --only hosting

# 4) Push commit
cd ..
git push origin main
```

## Verification Checklist
1. Build must finish with no TypeScript errors.
2. Firebase output must show `Deploy complete!`.
3. Hosting URL should be: `https://qyan-om.web.app`.
4. Push should complete with `main -> main`.
5. Final `git status --short` should be empty.

## If Build or Deploy Fails
1. Stop immediately.
2. Fix errors first.
3. Run build again.
4. Deploy only after build succeeds.

## Optional: HostGator Deployment
If you also deploy to HostGator, run this after a successful build:

```powershell
cd C:\Projects\quiz-engine\admin-app
npm run deploy:hostgator
```

## Release Log Template
Add one line after each successful release.

```text
WorkHub v.002 | 2026-04-08 | <commit-sha> | <short notes>
```
