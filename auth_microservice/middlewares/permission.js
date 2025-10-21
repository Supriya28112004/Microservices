// middleware/permission.js
import { PERMISSIONS } from "../../shared/constants/roles.js";

export function checkRolePermission(allowedRoles) {
  return (req, res, next) => {
    const currentUserRole = req.user.role;
    if (!allowedRoles.includes(currentUserRole)) {
      return res.status(403).json({ message: "Access denied: role not permitted" });
    }
    next();
  };
}
