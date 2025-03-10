import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.css'
import App from './components/App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId="374573652102-chk83u6v9eq7bnu2prd9tkojuc9e8tu1.apps.googleusercontent.com">
  <StrictMode>
    <App />
  </StrictMode>,
  </GoogleOAuthProvider>
)
