const fs = require('fs');
let code = fs.readFileSync('components/tasks/TaskCreationWizard.tsx', 'utf8');

const target = `                </select>
              </div>
              </div>
            </div>`;

const repl = `                </select>
              </div>
            </div>`;

code = code.replace(target, repl);
fs.writeFileSync('components/tasks/TaskCreationWizard.tsx', code);
console.log("Fixed extra div");
