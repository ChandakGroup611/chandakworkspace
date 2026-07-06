const fs = require('fs');
const file = 'd:/adios/app/amc/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Insert useEffect below solutionLineItems state
const stateLine = "const [solutionLineItems, setSolutionLineItems] = useState<SolutionLineItem[]>([]);";
const useEffectCode = `
  useEffect(() => {
    if (solutionLineItems && solutionLineItems.length > 0) {
      const total = solutionLineItems.reduce((sum, i) => sum + i.netAmount, 0);
      setFormCost(total ? total.toFixed(2) : "");
    }
  }, [solutionLineItems]);
`;
content = content.replace(stateLine, stateLine + '\n' + useEffectCode);

// 2. Replace the Cost Input UI
const oldCostUI = `                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Manual Overall Cost (Legacy)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <AppInput type="number" step="0.01" value={formCost} onChange={(e) => setFormCost(e.target.value)} className="pl-9" placeholder="0.00" />
                      </div>
                    </div>`;

const newCostUI = `                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase">
                        {solutionLineItems.length > 0 ? "Overall Cost (Auto-Calculated)" : "Manual Overall Cost (Legacy)"}
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <AppInput 
                          type="number" 
                          step="0.01" 
                          value={formCost} 
                          onChange={(e) => setFormCost(e.target.value)} 
                          className="pl-9" 
                          placeholder="0.00" 
                          disabled={solutionLineItems.length > 0} 
                        />
                      </div>
                    </div>`;

content = content.replace(oldCostUI, newCostUI);

fs.writeFileSync(file, content);
console.log('Added auto-calculation for cost');
