import { useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import StaffDashboard from './components/StaffDashboard';
import StudentDashboard from './components/StudentDashboard';

function App() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <AuthForm />;
  }

  return profile.role === 'staff' ? <StaffDashboard /> : <StudentDashboard />;
}

export default App;
