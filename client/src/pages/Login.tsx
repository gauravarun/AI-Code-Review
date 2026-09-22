import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { loginUrl } = useAuth();
  const [params] = useSearchParams();
  const error = params.get("error");

  return (
    <div className="login-page">
      <h1>AI Code Review Tool</h1>
      <p>Paste a GitHub pull request URL and get an AI-generated code review in seconds.</p>
      {error && <p className="error-text">Sign-in failed. Please try again.</p>}
      <a className="github-login-btn" href={loginUrl}>
        Sign in with GitHub
      </a>
    </div>
  );
}
