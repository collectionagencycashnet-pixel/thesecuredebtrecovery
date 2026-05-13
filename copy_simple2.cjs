const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/Secure Login Area/g, 'Staff Login');
content = content.replace(/Identity/g, 'Details');
content = content.replace(/Variables/g, 'Info');
content = content.replace(/Admin Hub/g, 'Staff Dashboard');
content = content.replace(/Terminal/g, 'Finish');
content = content.replace(/The Secure Debt Recovery/g, 'Debt Assistance Team');
content = content.replace(/Secure Debt Assistance/g, 'Debt Assistance Team');

fs.writeFileSync('src/App.tsx', content, 'utf8');
