import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getFirstAllowedPath, hasPageAccess } from "./pageAccess";
import type { PageAccessKey } from "../../types";

export const ProtectedRoute = ({
  children,
  requiredPage
}: {
  children: JSX.Element;
  requiredPage?: PageAccessKey;
}) => {
  const { token, user } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (requiredPage && !hasPageAccess(user, requiredPage)) {
    return <Navigate to={getFirstAllowedPath(user)} replace />;
  }
  return children;
};
