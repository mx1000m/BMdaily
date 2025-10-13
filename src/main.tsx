import React from 'react';
import ReactDOM from 'react-dom/client';
import { BMApp } from './ui/BMApp';
import '@coinbase/onchainkit/styles.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<BMApp />
	</React.StrictMode>
);




