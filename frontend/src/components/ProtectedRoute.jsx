import { Navigate } from 'react-router-dom';
import { getUser, homePathFor } from '../config/auth';

// Sends logged-out visitors to /login and users with the wrong role to their
// own home page. The backend checks the token on every request as well; this
// only keeps people off pages they cannot use.
const ProtectedRoute = ({ role, children }) => {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.userType !== role) {
    return <Navigate to={homePathFor(user)} replace />;
  }
  return children;
};

export default ProtectedRoute;
