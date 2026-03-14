const FtpDeploy = require('ftp-deploy');
const path = require('path');

const config = {
    user: process.env.HOSTGATOR_FTP_USERNAME,
    password: process.env.HOSTGATOR_FTP_PASSWORD,
    host: process.env.HOSTGATOR_FTP_SERVER,
    port: 21,
    localRoot: path.join(__dirname, 'dist'),
    remoteRoot: '/public_html/', // Change if needed
    include: ['*', '**/*'],
    deleteRemote: false, // Set to true to delete remote files not in local
    forcePasv: true
};

const ftpDeploy = new FtpDeploy();

ftpDeploy.on('log', data => {
    console.log(data);
});

ftpDeploy.deploy(config)
    .then(res => console.log('Deployment complete:', res))
    .catch(err => console.error('Deployment failed:', err));
