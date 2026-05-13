const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Title changes
content = content.replace(/The Secure Debt Recovery/g, 'Secure Debt Assistance');
content = content.replace(/Financial Stability Solutions/g, 'Confidential Financial Support');

// Landing Page hero changes
content = content.replace('Trusted Legal Compliance', 'Trusted Support');
content = content.replace('Recover Your Money. <br className="hidden md:block"/>\n            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">Fast, Legal, and Secure.</span>', 'Get Financial Relief. <br className="hidden md:block"/>\n            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-400">Simple, secure, and confidential.</span>');

content = content.replace('Professional debt recovery assistance tailored to your case. We handle the complexity so you can regain your financial stability with confidence.', 'We offer professional and confidential assistance to help you manage and recover from financial setbacks. Our team simplifies the process so you can move forward with confidence.');

// Replace all occurrences of CTA button text
content = content.replace(/Start Recovery Now/g, 'Submit Application');
content = content.replace(/Submit Your Case Now/g, 'Submit Application');
content = content.replace(/Submit Your Case/g, 'Submit Application');

content = content.replace(/Take control of your financial loss today\. Secure submission\./g, 'Take the first step towards resolving your financial situation today. Your information is securely protected.');

content = content.replace('Enterprise-Grade Security & Compliance', 'Your Privacy is Our Priority');

// Button text in headers
content = content.replace(/'Apply Node'/g, "'Apply Now'");
content = content.replace(/"Apply Node"/g, '"Apply Now"');
content = content.replace(/>Apply Node</g, '>Apply Now<');

fs.writeFileSync('src/App.tsx', content, 'utf8');
