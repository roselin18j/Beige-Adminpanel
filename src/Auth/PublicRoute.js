import React, { useEffect, useState } from "react";
import { makeApiRequest } from "../AxiosServices/apiCall";
import { Navigate, useNavigate } from "react-router-dom";

function PublicRoute({ children }) {
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

  if (authenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PublicRoute;