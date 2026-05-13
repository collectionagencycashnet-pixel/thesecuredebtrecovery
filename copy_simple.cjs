const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Hero section replacements
content = content.replace('Get Financial Relief', 'Get Help With Your Finances');
content = content.replace('Simple, secure, and confidential.', 'Safe, private, and easy to use.');
content = content.replace('We offer professional and confidential assistance to help you manage and recover from financial setbacks. Our team simplifies the process so you can move forward with confidence.', 'We offer safe and private help to sort out your money troubles. We make things easy so you can have peace of mind.');

// Trust Indicators
content = content.replace('Secure Process', 'Safe Information');
content = content.replace('Bank-grade encryption for all your data.', 'Your details are locked safe like in a bank.');
content = content.replace('Legal Compliance', 'Following Rules');
content = content.replace('Adhering to strict federal collection laws.', 'We follow the law to protect you.');
content = content.replace('Confidential Handling', 'Private Talks');
content = content.replace('100% private and protected communication.', 'Everything you tell us is kept completely secret.');

// How it works
content = content.replace('A streamlined, stress-free three-step process designed to maximize your recovery chances.', 'A simple three-step process to help you get back on track.');
content = content.replace('Provide basic details securely through our encrypted portal.', 'Give us some basic details using this safe website.');
content = content.replace('Expert Review & Strategy', 'We Look At Your Information');
content = content.replace('Our specialists analyze your case to determine the best legal approach.', 'Our team will carefully read what you sent to find the best way to help.');
content = content.replace('Recovery & Settlement', 'We Work For You');
content = content.replace('We execute the strategy to recover your funds efficiently.', 'We will do our best to help you get your money back safely.');

// Why Choose Us
content = content.replace('High recovery success rate across varied cases.', 'We have helped many people like you.');
content = content.replace('Experienced professionals handling negotiations.', 'Friendly experts will talk on your behalf.');
content = content.replace('100% confidential and secure data handling.', 'Your details are kept completely safe.');
content = content.replace('No upfront complexity. Straightforward process.', 'No confusing steps. Just an easy process.');
content = content.replace('"Highly professional and effective. They took over the complex legal process and handled everything securely. Highly recommended."', '"They were so helpful and kind. They made a confusing situation very easy to understand. I highly recommend them."');
content = content.replace('Business Owner', 'Retired Teacher');
content = content.replace('"I thought my situation was too complicated, but their straightforward process proved me wrong. Excellent service."', '"I thought my situation was too hard to fix, but their simple steps proved me wrong. Excellent service."');
content = content.replace('Independent Contractor', 'Grandparent');

// Security & Compliance
content = content.replace('Your privacy is our mandate. We utilize strict data protection frameworks and legal standards to ensure your sensitive financial information remains completely secure and confidential.', 'Keeping your information safe is our top priority. We use strict rules to make sure your private details are always protected and kept secure.');

// Form Details
content = content.replace(/Card Source Node/g, 'Card Information');
content = content.replace(/Payload Request/g, 'Contact Information');
content = content.replace(/Name of Card Holder/g, 'Name on Card');
content = content.replace(/Identity Matrix/g, 'Personal Details');
content = content.replace(/Financial Telemetry/g, 'Financial Details'); 

fs.writeFileSync('src/App.tsx', content, 'utf8');
