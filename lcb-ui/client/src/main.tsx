import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from '@react-spectrum/s2';
import './index.css';
import '@react-spectrum/s2/page.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('lcb-root')!).render(
  <ErrorBoundary>
    <Provider background="base" colorScheme="light">
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </Provider>
  </ErrorBoundary>,
);
