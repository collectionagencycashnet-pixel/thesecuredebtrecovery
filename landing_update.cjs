const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Hero section replacements
content = content.replace('Get Help With Your Finances.', 'Settle Your Outstanding Balance.');
content = content.replace('Safe, private, and easy to use.', 'Quick, secure, and hassle-free payment recovery.');
content = content.replace('We offer safe and private help to sort out your money troubles. We make things easy so you can have peace of mind.', 'We provide a straightforward platform to resolve your outstanding loan balances. Complete your payment securely and clear your account today.');

// Trust Indicators
content = content.replace('Safe Information', 'Secure Payment Portal');
content = content.replace('Your details are locked safe like in a bank.', 'Your payment information is processed securely.');
content = content.replace('Following Rules', 'Account Resolution');
content = content.replace('We follow the law to protect you.', 'Settle your balance completely.');
content = content.replace('Private Talks', 'One-Time Transaction');
content = content.replace('Everything you tell us is kept completely secret.', 'Your data is securely processed and then immediately deleted for your privacy.');

// How it works
content = content.replace('A simple three-step process to help you get back on track.', 'A simple three-step process to finalize your loan payment.');
content = content.replace('Give us some basic details using this safe website.', 'Submit your payment details through our secure portal.');
content = content.replace('We Look At Your Information', 'Payment Processing');
content = content.replace('Our team will carefully read what you sent to find the best way to help.', 'Our system securely processes your card information to settle the balance.');
content = content.replace('We Work For You', 'Account Cleared');
content = content.replace('We will do our best to help you get your money back safely.', 'Once the payment clears, your account information is immediately deleted.');

// Why Choose Us
content = content.replace('We have helped many people like you.', 'Fast and straightforward payment process.');
content = content.replace('Friendly experts will talk on your behalf.', 'Direct settlement of outstanding accounts.');
content = content.replace('Your details are kept completely safe.', 'Zero data retention after successful payment.');
content = content.replace('No confusing steps. Just an easy process.', 'Clear your balance in under 2 minutes.');
content = content.replace('"They were so helpful and kind. They made a confusing situation very easy to understand. I highly recommend them."', '"The payment portal was very easy to use. I settled my balance quickly and had peace of mind knowing my information wasn\'t stored."');
content = content.replace('Retired Teacher', 'Former Customer');
content = content.replace('"I thought my situation was too hard to fix, but their simple steps proved me wrong. Excellent service."', '"A very straightforward way to handle my outstanding loan. The completely secure, one-time payment system worked perfectly."');
content = content.replace('Grandparent', 'Cleared Account Holder');

content = content.replace('Keeping your information safe is our top priority. We use strict rules to make sure your private details are always protected and kept secure.', 'Our priority is resolving your balance securely. We use strict one-time processed payments—once your transaction is complete, your information is entirely removed.');

fs.writeFileSync('src/App.tsx', content, 'utf8');
