
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { makeApiRequest } from "../AxiosServices/apiCall";

function ProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const response = await makeApiRequest({
          url: "admin-check-auth",
          method: "GET",
        });

        if (mounted) {
          setAuthenticated(response?.status === true);
        }
      } catch (error) {
        console.error(
          "Authentication Error:",
          error.response?.data || error.message
        );

        if (mounted) {
          setAuthenticated(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  if (authenticated === null) {
    return <div>Checking authentication...</div>;
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
