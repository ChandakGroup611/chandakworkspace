const fs = require('fs');
let content = fs.readFileSync('d:/adios/app/requirements/page.tsx', 'utf8');

const missingImports = `import { 
  FileCheck2, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ShieldAlert, 
  Plus, 
  CheckSquare, 
  Square,
  Users,
  GitCommit,
  AlertTriangle,
  ArrowRight,
  History,
  Tag,
  FileCode,
  RefreshCw,
  ArrowLeft,
  Search,
  Edit2,
  Trash2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";`;

content = content.replace(
  /import \{ [\s\S]*?Square,[\s\S]*?import TaskCreationWizard/m,
  missingImports + '\n\nimport TaskCreationWizard'
);

fs.writeFileSync('d:/adios/app/requirements/page.tsx', content);
