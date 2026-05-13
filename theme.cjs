const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace LandingPage colors
const startInd = content.indexOf('function LandingPage');
const endInd = content.indexOf('function AdminLogin');

let sub = content.substring(startInd, endInd);

sub = sub.replace(/emerald/g, 'rose');
sub = sub.replace(/blue-400/g, 'orange-400');
sub = sub.replace(/blue-500/g, 'orange-500');
sub = sub.replace(/blue-600/g, 'orange-600');
sub = sub.replace(/blue-100/g, 'orange-100');

// Replace dark backgrounds
sub = sub.replace(/bg-\\[#040914\\]/g, 'bg-[#09090b]');
sub = sub.replace(/bg-\\[#0a0f1c\\]/g, 'bg-[#121214]');
sub = sub.replace(/bg-\\[#000a18\\]/g, 'bg-[#09090b]');
sub = sub.replace(/bg-\\[#001430\\]/g, 'bg-[#002147]');

// Update dark mode backgrounds
sub = sub.replace(/dark:bg-\\[#040914\\]/g, 'dark:bg-transparent');
sub = sub.replace(/dark:bg-\\[#0a0f1c\\]/g, 'dark:bg-[#121214]');

content = content.substring(0, startInd) + sub + content.substring(endInd);
fs.writeFileSync('src/App.tsx', content, 'utf8');
