import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Home from './pages/Home/Home';
import MyRequests from './pages/MyRequests/MyRequests';
import ManageRequests from './pages/ManageRequests/ManageRequests';
import MyTasks from './pages/MyTasks/MyTasks';
import TaskDetail from './pages/TaskDetail/TaskDetail';
import RequestDetail from './pages/RequestDetail/RequestDetail';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
