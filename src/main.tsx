import React from 'react';
import ReactDOM from 'react-dom/client';
import { BMApp } from './ui/BMApp';
// AppKit CSS is loaded automatically via the library
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<BMApp />
	</React.StrictMode>
);




