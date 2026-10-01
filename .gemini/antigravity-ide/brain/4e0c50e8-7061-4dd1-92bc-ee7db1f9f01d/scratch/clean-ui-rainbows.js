const fs = require('fs');
const path = require('path');

const files = [
  'app/migration/Client.tsx',
  'app/select-module/page.tsx',
  'components/amc/AMCExecutiveDashboard.tsx',
  'components/dashboard/portfolio/MyPortfolioSection.tsx',
  'components/dashboard/portfolio/UserComparisonMatrix.tsx',
  'app/learning/LearningHubClient.tsx',
  'app/knowledge/articles/page.tsx'
];

for (const rel of files) {
  const filePath = path.join('D:/adios', rel);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  if (rel === 'app/migration/Client.tsx') {
    content = content.replace(
      /variant="ghost"\s+className="w-full bg-surface border border-border\/50 text-foreground from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-indigo-900\/20"/,
      'variant="primary"\n                className="w-full font-semibold"'
    );
    content = content.replace('"Building Excel File..." : "Download Smart Template"', '"Generating Template..." : "Download Template"');
  }

  if (rel === 'app/learning/LearningHubClient.tsx') {
    content = content.replace('text-4xl md:text-5xl font-extrabold', 'text-2xl font-bold');
  }

  if (rel === 'app/knowledge/articles/page.tsx') {
    content = content.replace('text-4xl font-black mb-8', 'text-2xl font-bold mb-6');
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Cleaned:', rel);
  } else {
    console.log('No change needed or pattern not matched:', rel);
  }
}
