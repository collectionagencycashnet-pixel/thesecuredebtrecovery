const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const returnStart = content.indexOf('<div className="relative w-full font-sans bg-slate-50 dark:bg-[#040914] text-slate-900 dark:text-zinc-100">');
const formSectionHeader = content.indexOf('{/* 7. Form Section */}', returnStart);
const formTagStart = content.indexOf('<form', formSectionHeader);

const landingPart = content.substring(returnStart, formSectionHeader);

// build LandingPage string
let landingComp = `function LandingPage({ onStart }: { onStart: () => void }) {
  return (
${landingPart.replace(/onClick=\{\(\) => \{ document\.getElementById\('recovery-form'\)\?\.scrollIntoView\(\{ behavior: 'smooth' \}\); \}\}/g, 'onClick={onStart}')}
      {/* 7. Final Form CTA Section */}
      <section className="py-24 px-4 bg-white dark:bg-[#0a0f1c] border-t border-slate-200 dark:border-white/5 relative">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Submit Your Case Now</h2>
          <p className="text-slate-500 dark:text-zinc-400 font-medium max-w-xl mx-auto mb-8">Take control of your financial loss today. Secure submission.</p>
          <div className="pt-4">
            <button onClick={onStart} className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:-translate-y-1">
              Submit Your Case Now
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

`;

// Form wrapper string
const newFormWrapper = `    <div className="relative w-full font-sans bg-slate-50 dark:bg-[#040914] text-slate-900 dark:text-zinc-100 min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16 space-y-4 pt-10">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Submit Your Case Now</h2>
          <p className="text-slate-500 dark:text-zinc-400 font-medium max-w-xl mx-auto">Take control of your financial loss today. Secure submission.</p>
        </div>
`;

// Extract form end
const formEndIndex = content.indexOf('</form>', formTagStart) + '</form>'.length;
const regexEnd = /\s*<\/div>\n\s*<\/section>\n\s*<\/div>/;
const match = content.substring(formEndIndex).match(regexEnd);

if (match) {
  let finalContent = content.substring(0, returnStart) + newFormWrapper + content.substring(formTagStart, formEndIndex) + '\n      </div>\n    </div>';
  finalContent += content.substring(formEndIndex + match[0].length);
  finalContent = finalContent.replace('function PublicApplicationForm', landingComp + 'function PublicApplicationForm');
  fs.writeFileSync('src/App.tsx', finalContent, 'utf8');
  console.log("Success");
} else {
  console.log("Failed to match end.");
}
