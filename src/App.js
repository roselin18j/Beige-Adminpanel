import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "react-toastify/dist/ReactToastify.css";

import Login from "./Seperate/Login";
import Forgetpassword from "./Seperate/Forgetpassword";
import Resetpassword from "./Seperate/Resetpassword";
import Otp from "./Seperate/Otp";

import SideBar from "./Seperate/SideBar";
import ProtectedRoute from "./Auth/ProtectedRoute";
import PublicRoute from "./Auth/PublicRoute";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/forgetpassword"
            element={
              <PublicRoute>
                <Forgetpassword />
              </PublicRoute>
            }
          />

          <Route
            path="/resetpassword/:token"
            element={
              <PublicRoute>
                <Resetpassword />
              </PublicRoute>
            }
          />

          <Route
            path="/otp"
            element={
              <PublicRoute>
                <Otp />
              </PublicRoute>
            }
          />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SideBar />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;