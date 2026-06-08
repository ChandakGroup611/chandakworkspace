const fs = require('fs');

const files = [
  'd:\\adios\\components\\layout\\Sidebar.tsx',
  'd:\\adios\\components\\layout\\Navbar.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace text ternaries
  content = content.replace(/isLight \? "text-gray-900" : "text-white"/g, '"text-foreground"');
  content = content.replace(/isLight \? "text-gray-700" : "text-gray-300"/g, '"text-foreground"');
  content = content.replace(/isLight \? "text-gray-600" : "text-gray-400"/g, '"text-muted"');
  content = content.replace(/isLight \? "text-gray-500" : "text-gray-400"/g, '"text-muted"');
  
  // Replace background + border ternaries
  content = content.replace(/isLight \? "bg-white border-gray-200" : "bg-\[#0A0D14\] border-white\/5"/g, '"bg-surface border-border"');
  content = content.replace(/isLight \? "bg-white border-gray-200" : "bg-black\/30 border-white\/10"/g, '"bg-surface border-border"');
  content = content.replace(/isLight \? "bg-white border-gray-200" : "bg-white\/5 border-white\/10"/g, '"bg-surface border-border"');
  content = content.replace(/isLight \? "bg-white border-gray-200 shadow-sm" : "bg-white\/\[0\.02\] border-white\/5 shadow-lg"/g, '"bg-surface border-border shadow-[var(--shadow-ambient)]"');
  content = content.replace(/isLight \? "bg-white\/60 border-gray-200\/60 shadow-sm" : "bg-white\/\[0\.02\] border-white\/5 shadow-lg"/g, '"bg-surface border-border shadow-[var(--shadow-ambient)]"');
  content = content.replace(/isLight \? "bg-white" : "bg-black\/30"/g, '"bg-surface"');
  content = content.replace(/isLight \? "bg-gray-50 text-gray-900" : "bg-\[#070913\] text-white"/g, '"bg-surface text-foreground"');
  
  // Custom sidebar/navbar specifics
  content = content.replace(/isLight \? "border-gray-100" : "border-white\/5"/g, '"border-border"');
  content = content.replace(/isLight \n\s*\? "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-400" \n\s*: "bg-\[#111522\] border-white\/10 text-gray-400 hover:text-white hover:border-blue-500"/g, '"bg-surface border-border text-muted hover:text-foreground hover:border-accent"');
  content = content.replace(/isLight \n\s*\? "text-gray-500 hover:bg-gray-100 hover:text-gray-900" \n\s*: "text-gray-400 hover:bg-white\/5 hover:text-white"/g, '"text-muted hover:bg-elevated hover:text-foreground"');
  content = content.replace(/isLight\n\s*\? "bg-white border-gray-200 shadow-sm"\n\s*: "bg-\[#0A0D14\] border-white\/5"/g, '"bg-surface border-border"');
  
  // Navbar specifics
  content = content.replace(/isLight \? "bg-white\/80 border-gray-200 shadow-sm" : "bg-\[#0A0D14\]\/80 border-white\/5"/g, '"bg-surface border-border"');
  content = content.replace(/isLight \? "bg-gray-100 text-gray-700" : "bg-white\/10 text-white"/g, '"bg-elevated text-foreground"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log("Refactored:", file);
  } else {
    console.log("No changes:", file);
  }
});
