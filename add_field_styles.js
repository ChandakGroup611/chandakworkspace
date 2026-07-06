const fs = require('fs');
const file = 'd:/adios/app/globals.css';
let content = fs.readFileSync(file, 'utf8');

const style = `
  /* Universal Field Styling (Inputs, Selects, Textareas) */
  /* Adds a recognizable light border, a soft shadow, and hover effects globally */
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

// Insert the style right before the last closing brace of the utilities layer
content = content.replace(/\n\}\n*$/, style + '\n}\n');
fs.writeFileSync(file, content);
console.log('Added global field styles');
