import https from 'https';

const url = 'https://id.wikipedia.org/wiki/Berkas:Logo_Kota_Samarinda.png';
const options = { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } };

https.get(url, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = data.match(/https:\/\/upload\.wikimedia\.org\/wikipedia\/[^"'\s]+/g);
    console.log('Matches:', matches ? matches.slice(0, 10) : 'none');
  });
});
