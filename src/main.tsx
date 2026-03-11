import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { registerServiceWorker } from './sw-register';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

registerServiceWorker();
