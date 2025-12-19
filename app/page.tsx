"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignInMessage, setShowSignInMessage] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordEmployeeId, setForgotPasswordEmployeeId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const needsSignin = searchParams.get("needsignin");

    if (needsSignin === "true") {
      setShowSignInMessage(true);
      window.history.replaceState({}, document.title, window.location.pathname);

      const timer = setTimeout(() => {
        setShowSignInMessage(false);
      }, 5000);

      return () => clearTimeout(timer);
    }

    const employee = sessionStorage.getItem("employee");
    if (employee) {
      const userData = JSON.parse(employee);
      if (userData.employeeId && userData.employeeId.startsWith("ADM")) {
        router.push("/admin");
      } else if (userData.employeeId && userData.employeeId.startsWith("HAD")) {
        router.push("/HRadmin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: employeeId.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        sessionStorage.setItem("employee", JSON.stringify(data.employee));
        console.log("Login successful:", data.employee);

        if (data.employee.employeeId.startsWith("ADM")) {
          router.push("/admin");
        } else if (data.employee.employeeId.startsWith("HAD")) {
          router.push("/HRadmin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    setShowForgotPasswordModal(true);
    setForgotPasswordStep(1);
    setForgotPasswordEmployeeId("");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotPasswordError("");
    setResetSuccess(false);
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
  };

  const validateEmployeeId = (id: string) => {
    return id.trim().length > 0;
  };

  const validatePassword = (password: string) => {
    // Password must be at least 8 characters and contain at least one uppercase letter and one number
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return password.length >= 8 && hasUpperCase && hasNumber;
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmployeeId(forgotPasswordEmployeeId)) {
      setForgotPasswordError("Please enter a valid Employee ID");
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: forgotPasswordEmployeeId.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Move to the next step
        setForgotPasswordStep(2);
      } else {
        setForgotPasswordError(
          data.error || "Request failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Forgot password request error:", error);
      setForgotPasswordError("Network error. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode) {
      setForgotPasswordError("Please enter the verification code");
      return;
    }

    if (!validatePassword(newPassword)) {
      setForgotPasswordError(
        "Password must be at least 8 characters long, include at least one uppercase letter, and one number"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotPasswordError("Passwords do not match");
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: forgotPasswordEmployeeId.trim(),
          verificationCode: verificationCode.trim(),
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResetSuccess(true);

        // Close the modal and clear the login form after 3 seconds
        setTimeout(() => {
          setShowForgotPasswordModal(false);
          setEmployeeId(forgotPasswordEmployeeId);
          setPassword("");
        }, 3000);
      } else {
        setForgotPasswordError(
          data.error || "Password reset failed. Please try again."
        );
      }
    } catch (error) {
      console.error("Password reset error:", error);
      setForgotPasswordError("Network error. Please try again.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[url('/bg_login.svg')] bg-cover md:bg-[length:100%] bg-no-repeat bg-center md:bg-[center_100%] px-4 py-8">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 px-4 sm:px-6 lg:px-12">
        {/* Login Card */}
        <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          {/* ✅ Mobile logo inside login card */}
          <div className="flex lg:hidden justify-center mb-4">
            <img
              src="/Logo1.svg"
              alt="Insular Life Logo"
              className="w-24 sm:w-28 opacity-90"
            />
          </div>

          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              Welcome to Insular Life Employee Portal
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in below to begin using your account
            </p>
          </div>

          {/* Sign In Message */}
          {showSignInMessage && (
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 sm:px-4 sm:py-3 rounded flex items-start sm:items-center justify-between text-sm">
              <span>
                <strong>Session expired.</strong> Please sign in again to
                continue.
              </span>
              <button
                onClick={() => setShowSignInMessage(false)}
                className="text-blue-700 hover:text-blue-900 ml-2 flex-shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5 sm:space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="employeeId"
                className="block text-sm font-medium text-gray-700"
              >
                Employee ID
              </label>
              <input
                id="employeeId"
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="mt-1 w-full border-b border-gray-300 px-2 py-2 focus:outline-none focus:border-blue-500 text-black text-sm sm:text-base"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-black"
              >
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border-b border-gray-300 px-2 py-2 focus:outline-none focus:border-blue-500 text-black text-sm sm:text-base"
                required
                disabled={isLoading}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs sm:text-sm font-medium text-blue-600 mt-1"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide Password" : "Show Password"}
                </button>
              </div>
            </div>

            <div className="flex flex-col space-y-3 sm:space-y-4">
              <button
                type="submit"
                className={`w-full py-2.5 sm:py-3 px-4 sm:px-6 text-white rounded-md font-medium focus:outline-none transition-colors duration-300 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-blue-500 hover:to-orange-500 text-sm sm:text-base ${
                  isLoading ? "opacity-70 cursor-not-allowed" : ""
                }`}
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Log In"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={openForgotPasswordModal}
                  className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ✅ Logo Image - Hidden on mobile, visible on large screens */}
        <div className="hidden lg:flex lg:items-center lg:justify-center lg:w-1/2">
          <img
            src="/Logo1.svg"
            alt="Login Image"
            className="max-w-xs xl:max-w-md"
          />
        </div>
      </div>

      {/* Forgot Password Modal (unchanged) */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 sm:p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {forgotPasswordStep === 1
                  ? "Forgot Password"
                  : "Reset Password"}
              </h2>
              <button
                onClick={closeForgotPasswordModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none text-xl"
              >
                ✕
              </button>
            </div>

            {/* Success Message */}
            {resetSuccess && (
              <div className="mb-4 sm:mb-6 bg-green-50 border border-green-200 text-green-700 px-3 py-2 sm:px-4 sm:py-3 rounded text-sm">
                <p className="font-medium">Password reset successful!</p>
                <p className="text-xs sm:text-sm mt-1">
                  You can now log in with your new password.
                </p>
              </div>
            )}

            {!resetSuccess && (
              <>
                {/* Error Message */}
                {forgotPasswordError && (
                  <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded text-sm">
                    {forgotPasswordError}
                  </div>
                )}

                {/* Step 1: Request Code */}
                {forgotPasswordStep === 1 && (
                  <form onSubmit={handleRequestCode}>
                    <div className="mb-4 sm:mb-6">
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                        Enter your Employee ID to receive a verification code
                        via email.
                      </p>
                      <label
                        htmlFor="forgotPasswordEmployeeId"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Employee ID
                      </label>
                      <input
                        id="forgotPasswordEmployeeId"
                        type="text"
                        value={forgotPasswordEmployeeId}
                        onChange={(e) =>
                          setForgotPasswordEmployeeId(e.target.value)
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm sm:text-base"
                        required
                        disabled={forgotPasswordLoading}
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className={`py-2 px-3 sm:px-4 text-white rounded-md font-medium focus:outline-none transition-colors duration-300 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-blue-500 hover:to-orange-500 text-sm ${
                          forgotPasswordLoading
                            ? "opacity-70 cursor-not-allowed"
                            : ""
                        }`}
                        disabled={forgotPasswordLoading}
                      >
                        {forgotPasswordLoading ? "Sending..." : "Send Code"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 2: Verify Code and Reset Password */}
                {forgotPasswordStep === 2 && (
                  <form onSubmit={handleResetPassword}>
                    <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                        Enter the verification code sent to your email and
                        create a new password.
                      </p>
                      <div>
                        <label
                          htmlFor="verificationCode"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Verification Code
                        </label>
                        <input
                          id="verificationCode"
                          type="text"
                          value={verificationCode}
                          onChange={(e) =>
                            setVerificationCode(e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm sm:text-base"
                          required
                          disabled={forgotPasswordLoading}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="newPassword"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) =>
                              setNewPassword(e.target.value)
                            }
                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm sm:text-base"
                            required
                            minLength={8}
                            disabled={forgotPasswordLoading}
                          />
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 text-xs sm:text-sm"
                            onClick={() =>
                              setShowNewPassword(!showNewPassword)
                            }
                          >
                            {showNewPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Must be 8+ characters with uppercase and number
                        </p>
                      </div>
                      <div>
                        <label
                          htmlFor="confirmPassword"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Confirm Password
                        </label>
                        <input
                          id="confirmPassword"
                          type={
                            showNewPassword ? "text" : "password"
                          }
                          value={confirmPassword}
                          onChange={(e) =>
                            setConfirmPassword(e.target.value)
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black text-sm sm:text-base"
                          required
                          disabled={forgotPasswordLoading}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotPasswordStep(1)}
                        className="text-blue-600 hover:text-blue-800 font-medium focus:outline-none text-sm"
                        disabled={forgotPasswordLoading}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className={`py-2 px-3 sm:px-4 text-white rounded-md font-medium focus:outline-none transition-colors duration-300 bg-gradient-to-r from-orange-500 to-blue-500 hover:from-blue-500 hover:to-orange-500 text-sm ${
                          forgotPasswordLoading ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                        disabled={forgotPasswordLoading || !validatePassword(newPassword) || newPassword !== confirmPassword}
                      >
                        {forgotPasswordLoading ? "Resetting..." : "Reset"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}