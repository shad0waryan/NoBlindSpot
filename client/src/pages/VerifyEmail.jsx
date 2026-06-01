import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

const VerifyEmail = () => {
  const { token } = useParams();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }

    const verify = async () => {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);

        setStatus("success");
        setMessage(
          res.data?.message ||
            "Your NoBlindSpot account has been successfully verified."
        );
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.message ||
            "This verification link is invalid or has expired."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="text-4xl mb-4">⏳</div>
            <h1 className="text-2xl font-bold mb-4">
              Verifying Email
            </h1>
            <p className="text-slate-400">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="text-5xl mb-4">✅</div>

            <h1 className="text-2xl font-bold text-green-500 mb-4">
              Email Verified
            </h1>

            <p className="text-slate-400 mb-6">
              {message}
            </p>

            <Link
              to="/login"
              className="btn-primary inline-block"
            >
              Continue to Login
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="text-5xl mb-4">❌</div>

            <h1 className="text-2xl font-bold mb-4">
              Verification Failed
            </h1>

            <p className="text-slate-400 mb-6">
              {message}
            </p>

            <Link
              to="/register"
              className="btn-primary inline-block"
            >
              Register Again
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;