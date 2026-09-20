import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));
const Home = lazy(() => import('./pages/Home/Home'));
const MyRequests = lazy(() => import('./pages/MyRequests/MyRequests'));
const ManageRequests = lazy(() => import('./pages/ManageRequests/ManageRequests'));
const MyTasks = lazy(() => import('./pages/MyTasks/MyTasks'));
const TaskDetail = lazy(() => import('./pages/TaskDetail/TaskDetail'));
const RequestDetail = lazy(() => import('./pages/RequestDetail/RequestDetail'));
const SubmitRequest = lazy(() => import('./pages/SubmitRequest/SubmitRequest'));
const ReportsAnalytics = lazy(() => import('./pages/ReportsAnalytics/ReportsAnalytics'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const UserManagement = lazy(() => import('./pages/UserManagement/UserManagement'));
const AdminRequestDetail = lazy(() => import('./pages/AdminRequestDetail/AdminRequestDetail'));

// Each page is its own JS chunk, downloaded only when first visited — a
// student never downloads the admin reports (or the chart library). After the
// first screen is up, the remaining chunks are fetched in idle time so later
// navigation feels instant (see preloadPages below).
const preloadPages = [
  () => import('./pages/MyRequests/MyRequests'),
  () => import('./pages/SubmitRequest/SubmitRequest'),
  () => import('./pages/RequestDetail/RequestDetail'),
  () => import('./pages/MyTasks/MyTasks'),
  () => import('./pages/TaskDetail/TaskDetail'),
  () => import('./pages/ManageRequests/ManageRequests'),
  () => import('./pages/Profile/Profile'),
];

function App() {
  useEffect(() => {
    const run = () => preloadPages.forEach((load) => load().catch(() => {}));
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 2000);
    return () => clearTimeout(id);
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests"
            element={
              <ProtectedRoute roles={['student']}>
                <MyRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/new"
            element={
              <ProtectedRoute roles={['student']}>
                <SubmitRequest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requests/:requestId"
            element={
              <ProtectedRoute roles={['student']}>
                <RequestDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-requests"
            element={
              <ProtectedRoute roles={['administrator']}>
                <ManageRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-requests/:requestId"
            element={
              <ProtectedRoute roles={['administrator']}>
                <AdminRequestDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute roles={['administrator']}>
                <ReportsAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute roles={['technician']}>
                <MyTasks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:requestId"
            element={
              <ProtectedRoute roles={['technician']}>
                <TaskDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute roles={['administrator']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
