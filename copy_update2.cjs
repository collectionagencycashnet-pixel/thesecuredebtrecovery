const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Form text
content = content.replace(/Routing Mapping/g, 'Mailing Address');
content = content.replace(/{ \/\* Node 3: Mailing Address \*\/ }/g, '{/* Step 3: Mailing Address */}');
content = content.replace(/{ \/\* Node 4: Terminal Trigger \*\/ }/g, '{/* Step 4: Submission */}');
content = content.replace(/Terminal Trigger/g, 'Submission');
content = content.replace(/Security Protocol Active/g, 'Secure Login Area');
content = content.replace(/{ \/\* Node 1: Identity Matrix \*\/ }/g, '{/* Step 1: Personal Details */}');
content = content.replace(/{ \/\* Node 2: Financial Telemetry \*\/ }/g, '{/* Step 2: Financial Details */}');
content = content.replace(/Identity Matrix/g, 'Personal Details');
content = content.replace(/Financial Telemetry/g, 'Financial Details');

// "Sci-Fi N8n Background Grid" -> "Background Grid"
content = content.replace(/Sci-Fi N8n Background Grid/g, 'Background Grid');

// Update any other remaining techy sounding terms
content = content.replace(/Authorize Access/g, 'Login');
content = content.replace(/Invalid password\. Access Denied\./g, 'Invalid password. Please try again.');

fs.writeFileSync('src/App.tsx', content, 'utf8');
