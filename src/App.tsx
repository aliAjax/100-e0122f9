import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import MonthlyComparison from "@/pages/MonthlyComparison";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/monthly-comparison" element={<MonthlyComparison />} />
      </Routes>
    </Router>
  );
}
