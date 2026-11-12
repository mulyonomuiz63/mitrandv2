import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ConfirmDialogProvider } from './components/ConfirmDialogModal';

createRoot(document.getElementById('root')!).render(
  <ConfirmDialogProvider>
    <App />
  </ConfirmDialogProvider>
);

