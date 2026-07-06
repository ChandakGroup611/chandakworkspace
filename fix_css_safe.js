const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/globals.css', 'utf8');

const style = `
  /* Universal Field Styling (Inputs, Selects, Textareas) */
  input:not([type="checkbox"]):not([type="radio"]):not(:focus),
  select:not(:focus),
  textarea:not(:focus) {
    border-width: 1px !important;
    border-style: solid !important;
    border-color: rgba(0, 0, 0, 0.15) !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  .theme-dark input:not([type="checkbox"]):not([type="radio"]):not(:focus),
  .theme-dark select:not(:focus),
  .theme-dark textarea:not(:focus) {
    border-color: rgba(255, 255, 255, 0.15) !important;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
  }

  input:not([type="checkbox"]):not([type="radio"]):not(:focus):hover,
  select:not(:focus):hover,
  textarea:not(:focus):hover {
    border-color: rgba(0, 0, 0, 0.3) !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
    transform: translateY(-1px);
  }

  .theme-dark input:not([type="checkbox"]):not([type="radio"]):not(:focus):hover,
  .theme-dark select:not(:focus):hover,
  .theme-dark textarea:not(:focus):hover {
    border-color: rgba(255, 255, 255, 0.3) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
    transform: translateY(-1px);
  }
`;

const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex !== -1) {
    content = content.substring(0, lastBraceIndex) + style + '\n}\n';
    fs.writeFileSync('d:/adios/app/globals.css', content);
    console.log('Successfully injected global styles!');
} else {
    // If somehow no brace, just append
    fs.writeFileSync('d:/adios/app/globals.css', content + style);
    console.log('Appended global styles to bottom');
}
