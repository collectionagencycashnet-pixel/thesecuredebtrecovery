const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Overwrite all remaining instances that don't match the new theme
sub = content;

// Replace #040914 with transparent (since root handles background) or #09090b
sub = sub.replace(/dark:bg-\\[#040914\\]/g, 'dark:bg-[#09090b]');
sub = sub.replace(/dark:bg-\\[#0a0f1c\\]/g, 'dark:bg-[#121214]');

// In the hero background, replace #000a18 with #09090b
sub = sub.replace(/dark:bg-\\[#000a18\\]/g, 'dark:bg-[#09090b]');

// There were some emeralds left
sub = sub.replace(/text-emerald-500/g, 'text-rose-500');
sub = sub.replace(/bg-emerald-500/g, 'bg-rose-500');
sub = sub.replace(/bg-emerald-600/g, 'bg-rose-600');
sub = sub.replace(/text-emerald-400/g, 'text-rose-400');
sub = sub.replace(/shadow-emerald-500/g, 'shadow-rose-500');
sub = sub.replace(/ring-emerald-500/g, 'ring-rose-500');
sub = sub.replace(/text-emerald-600/g, 'text-rose-600');
sub = sub.replace(/bg-emerald-50/g, 'bg-rose-50');
sub = sub.replace(/border-emerald-/g, 'border-rose-');

// Also update dark mode backgrounds
sub = sub.replace(/dark:bg-\\[#040914\\]/g, 'dark:bg-transparent');

// In UserDashboard, we want everything to match. Ensure rose accents are everywhere instead of emerald.
// Is there any specific orange needed? The Admin hub uses rose for primary and orange for gradient.
sub = sub.replace(/from-rose-500 via-orange-500 to-rose-500/g, 'from-rose-500 to-orange-500'); // simplify gradients
sub = sub.replace(/text-orange-500/g, 'text-rose-500');
sub = sub.replace(/bg-orange-500/g, 'bg-rose-500');
sub = sub.replace(/border-orange-500/g, 'border-rose-500');

fs.writeFileSync('src/App.tsx', sub, 'utf8');
