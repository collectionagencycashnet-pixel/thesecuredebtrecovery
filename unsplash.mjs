async function search() {
  const q = encodeURIComponent("credit card machine swipe");
  const res = await fetch(`https://unsplash.com/napi/search/photos?query=${q}&per_page=5`);
  const data = await res.json();
  if (data.results && data.results.length > 0) {
    console.log(data.results.map(r => r.urls.raw).join('\n'));
  }
}
search();
