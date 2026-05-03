import FtpDeploy from 'ftp-deploy'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
}

const ftpDeploy = new FtpDeploy();

ftpDeploy.on('log', (data) => {
    console.log(data)
})

ftpDeploy.deploy(config)
    .then((res) => console.log('Deployment complete:', res))
    .catch((err) => console.error('Deployment failed:', err))
