import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await api.post(
        `/auth/reset-password/${token}`,
        {
          password,
        }
      );

      setSuccess(res.data.message);

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password"
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Reset Password
        </h1>

        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}

        {success ? (
          <div className="text-center">
            <p className="text-green-500 mb-4">
              {success}
            </p>

            <p className="text-slate-400 text-sm">
              Redirecting to login...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <input
              type="password"
              className="input"
              placeholder="New Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <input
              type="password"
              className="input"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              required
            />

            <button
              type="submit"
              className="btn-primary w-full"
            >
              Reset Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;