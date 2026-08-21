import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ProtectedRoute } from './ProtectedRoute';

import { Landing } from '../pages/Landing';
import { HowItWorks } from '../pages/HowItWorks';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { Projects } from '../pages/Projects';
import { ProjectDetails } from '../pages/ProjectDetails';
import { SecurityScans } from '../pages/SecurityScans';
import { Vulnerabilities } from '../pages/Vulnerabilities';
import { GnnMalwareDetector } from '../pages/GnnMalwareDetector';
import { ComplianceReports } from '../pages/ComplianceReports';
import { Profile } from '../pages/Profile';
import { NotFound } from '../pages/NotFound';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<Landing />} />

      {/* Dedicated How It Works / Product Explanation Page */}
      <Route path="/how-it-works" element={<HowItWorks />} />

      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/sign-in" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/sign-up" element={<Register />} />
      </Route>

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetails />} />
          <Route path="/scans" element={<SecurityScans />} />
          <Route path="/vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/gnn-detector" element={<GnnMalwareDetector />} />
          <Route path="/reports" element={<ComplianceReports />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
