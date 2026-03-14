# HostGator Deployment Setup

## Required HostGator Information

You'll need to get these details from your HostGator cPanel:

1. **FTP Server**: Usually your domain (e.g., `yourdomain.com`) or IP address
2. **FTP Username**: Your cPanel username or FTP account username
3. **FTP Password**: Your cPanel password or FTP account password
4. **Target Directory**: Usually `/public_html/` for main website

## Setup Instructions

### 1. Get HostGator FTP Credentials
- Log into HostGator cPanel
- Go to "FTP Accounts" or "File Manager"
- Note your FTP hostname, username, and password
- Identify the target directory (typically `/public_html/`)

### 2. Configure GitHub Secrets
In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add these repository secrets:
   - `HOSTGATOR_FTP_SERVER`: Your FTP hostname
   - `HOSTGATOR_FTP_USERNAME`: Your FTP username  
   - `HOSTGATOR_FTP_PASSWORD`: Your FTP password

### 3. Test the Deployment
1. Commit and push changes to your main branch
2. GitHub Actions will automatically:
   - Build your React app
   - Deploy the `dist/` folder to HostGator via FTP
   - Upload only the built files (not source code)

### 4. Alternative: Manual Deployment Script
If you prefer local deployment:

```bash
# Install FTP client globally
npm install -g ftp-deploy

# Create deployment script
node deploy-to-hostgator.js
```

## Benefits of This Approach

✅ **Automatic**: Deploy on every push to main branch  
✅ **Fast**: Only uploads changed files  
✅ **Secure**: Credentials stored in GitHub secrets  
✅ **Reliable**: GitHub Actions handles the deployment  
✅ **Flexible**: Easy to modify target directory or exclude files

## Migration Considerations

- **DNS**: Keep your current DNS pointing to HostGator
- **SSL**: HostGator provides free SSL certificates
- **Database**: If using Firebase, no changes needed
- **Performance**: HostGator shared hosting is fine for React apps

## Next Steps

1. Get your HostGator FTP credentials
2. Set up GitHub secrets
3. Test with a small change
4. Your site will auto-deploy on future commits
