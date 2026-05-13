const fs = require('fs');

async function go() {
  const res = await fetch('https://stock.adobe.com/in/images/secure-online-payment-methods-for-safe-transactions-on-laptop/1498063529');
  const text = await res.text();
  const match = text.match(/https:\/\/[^"']*\.ftcdn\.net[^"']*/g);
  if (match) {
    console.log([...new Set(match)]);
  }
}

go();
