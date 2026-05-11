# deploy-readme

<small><strong>WorkHub v.015</strong></small>

Use this file for every release.

## Build Number Rule
1. Before each release, update the small line at the top: `WorkHub v.000`.
2. Keep 3 digits and increase by 1 each release.
3. Examples: `WorkHub v.001`, `WorkHub v.002`, `WorkHub v.003`.

## Correct Deployment Order (Do Not Change)
1. Update build number in this file.
2. Stage and commit changes.
3. Build the admin app.
4. Build Firebase Functions when backend/email code changed.
5. Deploy hosting and functions.
6. Push to GitHub.

## Standard Release Commands (Firebase)
Run these commands in this exact order:

```powershell
# 1) From repo root
cd C:\Projects\quiz-engine
git status --short
git add -A
git commit -m "release: WorkHub v.010"

# 2) Build in admin app
cd admin-app
npm run build

# 3) Build Firebase Functions when functions/ changed
cd functions
npm run build
cd ..

# 4) Deploy to Firebase hosting + functions (qyan-om)
firebase deploy --project qyan-om --only functions,hosting

# 5) Push commit
cd ..
git push origin main
```

## Verification Checklist
1. Build must finish with no TypeScript errors.
2. `functions/npm run build` must finish with no TypeScript errors when backend changes are included.
3. Firebase output must show `Deploy complete!`.
4. Hosting URL should be: `https://qyan-om.web.app`.
5. If email changes were deployed, verify delivery from the Master Admin overview test-email control.
6. Push should complete with `main -> main`.
7. Final `git status --short` should be empty.

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

## WorkHub Email Notes
1. Email notifications are sent by Firebase Functions, not by the Vite frontend.
2. For email features, make sure SMTP values are configured in `functions/.env` or the deployed Firebase function params.
3. Use the Master Admin overview page to send a test email after deployment.
4. Members can manage their own WorkHub email delivery from the notification menu after the deploy is live.

## Release Log Template
Add one line after each successful release.

```text
WorkHub v.010 | 2026-04-16 | <commit-sha> | <short notes>
```

## Release Log

WorkHub v.014 | 2026-05-09 | de4d42a | uploads library in video editor, video thumbnails, hover autoplay, Firestore collectionGroup rules fix
WorkHub v.015 | 2026-05-11 | 1519bf7 | generation polling reliability, gallery flicker fix, download video fix, lightbox project display, Unicode filenames
