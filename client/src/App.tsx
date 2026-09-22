import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

import { PublicLayout } from "@/layouts/PublicLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ProtectedRoute, AdminRoute, GuestRoute } from "@/routes/ProtectedRoute";

import Landing from "@/pages/public/Landing";
import HowItWorks from "@/pages/public/HowItWorks";
import Pricing from "@/pages/public/Pricing";
import Charities from "@/pages/public/Charities";
import CharityDetail from "@/pages/public/CharityDetail";
import Subscribe from "@/pages/public/Subscribe";
import Login from "@/pages/public/Login";
import Signup from "@/pages/public/Signup";

import Dashboard from "@/pages/app/Dashboard";
import Scores from "@/pages/app/Scores";
import Charity from "@/pages/app/Charity";
import Draws from "@/pages/app/Draws";
import Winnings from "@/pages/app/Winnings";
import Settings from "@/pages/app/Settings";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/Users";
import AdminSubscriptions from "@/pages/admin/Subscriptions";
import AdminScores from "@/pages/admin/Scores";
import AdminDraws from "@/pages/admin/Draws";
import AdminCharities from "@/pages/admin/Charities";
import AdminWinners from "@/pages/admin/Winners";
import AdminReports from "@/pages/admin/Reports";

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="charities" element={<Charities />} />
        <Route path="charities/:id" element={<CharityDetail />} />
        <Route path="subscribe" element={<Subscribe />} />
        <Route element={<GuestRoute />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="scores" element={<Scores />} />
          <Route path="charity" element={<Charity />} />
          <Route path="draws" element={<Draws />} />
          <Route path="winnings" element={<Winnings />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="subscriptions" element={<AdminSubscriptions />} />
          <Route path="scores" element={<AdminScores />} />
          <Route path="draws" element={<AdminDraws />} />
          <Route path="charities" element={<AdminCharities />} />
          <Route path="winners" element={<AdminWinners />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-10">Page not found.</div>} />
    </Routes>
  );
}
