
import React, { useEffect, useState } from "react";
import "../Assets/css/sign.css";
import frame2 from "../Assets/images/mobile-login.png";
import { BsFillEyeFill, BsFillEyeSlashFill } from "react-icons/bs";
import Profile from "../Assets/images/profile.png";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { makeApiRequest } from "../AxiosServices/apiCall";

function Login() {
  const year = new Date().getFullYear();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState({});
  const [sitename, setSitename] = useState("");
  const [siteyear, setSiteyear] = useState("");

  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };



  async function handleLoginSubmit(event) {
    event.preventDefault();

    const validationErrors = {};

    if (!email.trim()) {
      validationErrors.email = "Email is required";
    } else if (!isValidEmail(email.trim())) {
      validationErrors.email = "Invalid email format";
    }

    if (!password) {
      validationErrors.password = "Password is required";
    }

    setLoginError(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      const params = {
        url: "admin-login",
        method: "POST",
        data: {
          email: email.trim().toLowerCase(),
          password,
        },
      };

      console.log("Sending login request");

      const response = await makeApiRequest(params);

      console.log("Login API Response:", response);

      if (response?.status !== true) {
        toast.error(response?.message || "Invalid login credentials");
        return;
      }

      const userData = response.data || response.user || {};

      localStorage.setItem("email", userData.email || "");
      localStorage.setItem("name", userData.name || "");
      localStorage.setItem("role", userData.role || "");

      toast.success(response.message || "Login successful");

      console.log("Navigating to dashboard");

      navigate("/dashboard", { replace: true });

    } catch (error) {
      console.error(
        "Login Error:",
        error.response?.data || error.message
      );

      toast.error(
        error.response?.data?.message ||
        "An error occurred while processing your request."
      );
    }
  }


  useEffect(() => {
    const fetchSocialMediaLinks = async () => {
      try {
        const params = {
          url: "siteAddress",
          method: "GET",
        };

        const response = await makeApiRequest(params);

        const siteData = Array.isArray(response?.data)
          ? response.data[0]
          : response?.data;

        if (siteData) {
          setSitename(siteData.siteName || "");
          setSiteyear(siteData.siteYear || "");
        }
      } catch (error) {
        console.error("Error fetching site details:", error);
      }
    };

    fetchSocialMediaLinks();
  }, []);

  return (
    <>
      <ToastContainer />

      <div className="App">
        <div className="container-fluid">
          <div className="custom-sign min-vh-100">
            <div className="row">
              <div className="col-lg-12">
                <div className="row align-items-center">

                  <div className="col-lg-6 animi">
                    <div className="custom-sign-right">
                      <img
                        src={frame2}
                        className="animated-image"
                        alt="Animated Image"
                      />
                    </div>
                  </div>

                  <div className="col-lg-5">
                    <div className="custom-inside-sign">

                      <div className="text-center">
                        <img
                          style={{ width: "50px" }}
                          src={Profile}
                          alt="Profile"
                        />

                        <p className="fw-bold">Login</p>
                      </div>

                      <form onSubmit={handleLoginSubmit}>

                        {/* Email */}
                        <div className="mb-3">

                          <label
                            htmlFor="exampleInputEmail1"
                            className="form-label fw-bold"
                          >
                            Email
                          </label>

                          <input
                            type="email"
                            className="form-control custom-input"
                            id="exampleInputEmail1"
                            aria-describedby="emailHelp"
                            placeholder="Example@email.com"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);

                              setLoginError((prev) => ({
                                ...prev,
                                email: "",
                              }));
                            }}
                          />

                          <span style={{ color: "red" }}>
                            {loginError.email && (
                              <p>{loginError.email}</p>
                            )}
                          </span>

                        </div>

                        {/* Password */}
                        <div className="mb-3 position-relative">

                          <label
                            htmlFor="exampleInputPassword1"
                            className="form-label fw-bold"
                          >
                            Password
                          </label>

                          <input
                            type={showPassword ? "text" : "password"}
                            className="form-control custom-input"
                            id="exampleInputPassword1"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);

                              setLoginError((prev) => ({
                                ...prev,
                                password: "",
                              }));
                            }}
                          />

                          <span
                            onClick={togglePasswordVisibility}
                            className="position-absolute"
                            style={{
                              right: "10px",
                              top: "39px",
                              cursor: "pointer",
                            }}
                          >
                            {showPassword ? (
                              <BsFillEyeFill />
                            ) : (
                              <BsFillEyeSlashFill />
                            )}
                          </span>

                          <span style={{ color: "red" }}>
                            {loginError.password && (
                              <p>{loginError.password}</p>
                            )}
                          </span>

                        </div>

                        {/* Forgot Password */}
                        <div className="text-end">
                          <Link to="/forgetpassword">
                            <p className="costom-forgot-color">
                              Forgot Password?
                            </p>
                          </Link>
                        </div>

                        {/* Submit */}
                        <div className="text-center w-100">
                          <button
                            type="submit"
                            className="custom-sign-btn w-100"
                          >
                            Submit
                          </button>
                        </div>

                        {/* Footer */}
                        <div className="text-center">
                          <p>
                            © {sitename} {siteyear || year} ALL RIGHTS RESERVED
                          </p>
                        </div>

                      </form>

                      <div>
                        {/* <Darklight /> */}
                      </div>

                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
