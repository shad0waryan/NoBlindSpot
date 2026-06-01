import { Link, useLocation } from "react-router-dom";

const VerifyEmailSent = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Check your email</h1>

        <p className="text-slate-400 mb-4">
          We've sent a verification link to:
        </p>

        <p className="font-medium mb-6">
          {location.state?.email || "your email"}
        </p>

        <p className="text-sm text-slate-500">
          Please click the link in the email to activate your account.
        </p>

        <Link to="/login" className="btn-primary inline-block mt-6">
          Go to Login
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmailSent;
