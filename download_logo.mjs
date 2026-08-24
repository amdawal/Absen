import https from 'https';
import fs from 'fs';

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}, status: ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Saved ${dest} (${fs.statSync(dest).size} bytes)`);
        resolve();
      });
    }).on('error', reject);
  });
};

async function main() {
  fs.mkdirSync('public', { recursive: true });
  await download('https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Logo_Kota_Samarinda.png/500px-Logo_Kota_Samarinda.png', 'public/Logo_Kota_Samarinda.png');
  fs.copyFileSync('public/Logo_Kota_Samarinda.png', 'public/logo_samarinda.png');
  console.log('Done downloading logo');
}

main().catch(console.error);
