import { useState } from "react";
import api from "../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post(
        "/auth/forgot-password",
        { email }
      );

      setMessage(res.data.message);
    } catch {
      setMessage("Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">
          Forgot Password
        </h1>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            className="input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <button
            type="submit"
            className="btn-primary w-full mt-4"
          >
            Send Reset Link
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-slate-400">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;