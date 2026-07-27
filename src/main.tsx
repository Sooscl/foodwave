
import { createRoot } from 'react-dom/client';
import { AuthGate } from './auth/components/AuthGate';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(<AuthGate />);
  