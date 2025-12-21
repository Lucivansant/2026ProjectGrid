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
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'

function App() {
  return (
    <Router basename="/2026ProjectGrid">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/load-survey" element={<LoadSurvey />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/floor-plan" element={<FloorPlan />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
