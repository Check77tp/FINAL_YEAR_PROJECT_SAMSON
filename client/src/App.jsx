import { useEffect, useState } from 'react';
import { apiGet } from './services/api';
import './App.css';

// Scaffold-only placeholder: confirms the client can reach the Express API.
// Replace with real routed pages once feature work begins.
function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/health').then(setHealth).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="app-scaffold">
      <h1 className="app-scaffold-title">Hostel Maintenance Request and Tracking System</h1>
      <p className="app-scaffold-subtitle">Project scaffold — client and server wired up.</p>
      <div className="app-scaffold-status">
        {error && <span className="app-scaffold-status-error">API unreachable: {error}</span>}
        {!error && !health && <span>Checking server connection…</span>}
        {health && (
          <span className="app-scaffold-status-ok">
            Server status: {health.status} ({health.service})
          </span>
        )}
      </div>
    </main>
  );
}

export default App;
