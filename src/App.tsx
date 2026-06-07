import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Home from "@/pages/Home";
import MonthlyComparison from "@/pages/MonthlyComparison";
import { useDashboardStore } from "@/store/useDashboardStore";

export default function App() {
  const initialize = useDashboardStore((s) => s.initialize);
  const isLoading = useDashboardStore((s) => s.isLoading);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <div className="text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/monthly-comparison" element={<MonthlyComparison />} />
      </Routes>
    </Router>
  );
}
