const https = require('https');
https.get('https://api.pexels.com/v1/search?query=credit+card+pos+terminal+swipe&per_page=5', {
  headers: { 'Authorization': '563492ad6f91700001000001bcce9f0b87af4c9a826458564c760cd8' } // public test key
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).photos?.map(p => p.src.large)));
});
