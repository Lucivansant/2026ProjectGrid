import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Calculator from './pages/Calculator'
import LoadSurvey from './pages/LoadSurvey'
import Clients from './pages/Clients'
import Budgets from './pages/Budgets'
import Admin from './pages/Admin'
import FloorPlan from './pages/FloorPlan'
import NotFound from './pages/NotFound'
import Settings from './pages/Settings'
import Plans from './pages/Plans'
import Financial from './pages/Financial'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

import UpdatePassword from './pages/UpdatePassword'
import ThankYou from './pages/ThankYou'

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/thank-you" element={<ThankYou />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/load-survey" element={<LoadSurvey />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/floor-plan" element={<FloorPlan />} />
            <Route path="/settings" element={<Settings />} />

            <Route path="/financial" element={<Financial />} />
            <Route path="/dashboard/plans" element={<Plans isInternal={true} />} />
          </Route>
          </Route>


        {/* Catch-all 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App
