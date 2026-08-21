import { Toaster } from "react-hot-toast";
import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leave from "./pages/Leave";
import Settings from "./pages/Settings";
import PrintPayslip from "./pages/PrintPayslip";

import LoginForm from "./components/LoginForm";
import Payslips from "./pages/Payslips";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Announcements from "./pages/Announcements";
import SpecialDates from "./pages/SpecialDates";
import Reports from "./pages/Reports";
import Walls from "./pages/Walls";
import BillClaims from "./pages/BillClaims";
import Advance from "./pages/Advance";
import PrintBillVoucher from "./pages/PrintBillVoucher";
import PrintAdvanceVoucher from "./pages/PrintAdvanceVoucher";
import GatePass from "./pages/GatePass";

const App = () => {
  return (
    <>
      <Toaster />

      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Standalone print / document pages — no sidebar, no dashboard chrome */}
        <Route path="/print/payslips/:id" element={<PrintPayslip />} />
        <Route path="/print/bill-voucher/:id" element={<PrintBillVoucher />} />
        <Route path="/print/advance-voucher/:id" element={<PrintAdvanceVoucher />} />
        <Route path="/gate-pass" element={<GatePass />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/walls" element={<Walls />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="payslip" element={<Payslips />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/special-dates" element={<SpecialDates />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/bill-claims" element={<BillClaims />} />
          <Route path="/advance" element={<Advance />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

export default App;