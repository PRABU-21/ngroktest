import { GoogleOAuthProvider } from "@react-oauth/google";
import ReactDOM from "react-dom/client";
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="90309143735-1qfctscgnno0ah000vrnf37qv3bvtrt9.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
