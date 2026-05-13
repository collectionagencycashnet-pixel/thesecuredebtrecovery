const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace emerald with rose in general components where appropriate
sub = content;

// At 429
sub = sub.replace('<ShieldCheck className="w-5 h-5 text-emerald-500" />', '<ShieldCheck className="w-5 h-5 text-orange-500" />');

// In AdminDashboard/UserDashboard, maybe "emerald" is used for "Approved" or "Pay" buttons. Let's keep success colors as emerald (since it means money/approved).
// Wait, Admin dashboard says "Admin Hub". 

fs.writeFileSync('src/App.tsx', sub, 'utf8');
