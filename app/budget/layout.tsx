import "./budget.css";

export const metadata = { title: "Organization Budget" };

export default function BudgetLayout({ children }: { children: React.ReactNode }) {
  return <div className="budget-app">{children}</div>;
}
