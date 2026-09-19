const jwt = require("jsonwebtoken");
const { APP_ERRORS, createAppError } = require("../Common/AppError");
const { getJwtSettings } = require("../Config/Config");
const { findActiveRoleAccessByRoleId } = require("../Models/role.model");
const { findActiveShortcuts } = require("../Models/shortcut.model");
const {
  isLoginRole,
  findIdentitiesByMobile,
  findIdentityById,
  getIdentityFranchiseTypes,
} = require("./identity.service");
const { sendLoginOtp, verifyLoginOtp } = require("./otp.service");

// JWT with only the claims needed to find the user again. Tokens are
// stateless: nothing is stored.
const signToken = (identity) => {
  const settings = getJwtSettings();

  const token = jwt.sign(
    { user_id: identity.id, role: identity.roleName },
    settings.secret,
    {
      algorithm: settings.algorithm,
      expiresIn: settings.expiresIn,
      subject: String(identity.id),
      issuer: settings.issuer,
      audience: settings.audience,
    }
  );

  const { exp } = jwt.decode(token);

  return { token, expiresAt: new Date(exp * 1000) };
};

const verifyToken = (token) => {
  const settings = getJwtSettings();

  try {
    return jwt.verify(token, settings.secret, {
      algorithms: [settings.algorithm],
      issuer: settings.issuer,
      audience: settings.audience,
    });
  } catch (error) {
    throw createAppError(
      error.name === "TokenExpiredError"
        ? APP_ERRORS.SESSION_EXPIRED
        : APP_ERRORS.INVALID_SESSION
    );
  }
};

const getRoleAccess = async (roleId) => {
  const access = await findActiveRoleAccessByRoleId(roleId);

  if (!access) {
    return null;
  }

  return {
    roleId: access.roleId,
    canLogin: access.canLogin === "Y",
    leadScope: access.leadScope,
    canAddLead: access.canAddLead === "Y",
    canEditLead: access.canEditLead === "Y",
    canImportLeads: access.canImportLeads === "Y",
    canChangeFranchiseType: access.canChangeFranchiseType === "Y",
  };
};

const getShortcuts = async () => {
  const shortcuts = await findActiveShortcuts();

  return shortcuts.map((shortcut) => ({
    label: shortcut.label,
    icon: shortcut.icon,
    moduleCode: shortcut.moduleCode,
    statusCode: shortcut.systemCode,
  }));
};

// Same fields as the CodeIgniter CRM session payload
const buildSessionPayload = (identity, access, shortcuts) => {
  const cities = new Set(
    identity.franchiseTypes.map((type) => type.cityName).filter(Boolean)
  );

  return {
    user: {
      id: identity.id,
      name: identity.name,
      mobile: identity.mobile,
      email: identity.email,
      profileImage: identity.profileImage,
      role: identity.roleName,
      roleId: identity.roleId,
      roleName: identity.roleName,
      location: [...cities].join(", "),
      // franchiseTypes: identity.franchiseTypes.map((type) => ({
      //   id: type.id,
      //   name: type.name,
      //   code: type.code,
      //   cityName: type.cityName,
      //   status: type.status,
      // })),
    },
    // permissions: {
    //   leadScope: access.leadScope,
    //   canAddLead: access.canAddLead,
    //   canEditLead: access.canEditLead,
    //   canImportLeads: access.canImportLeads,
    //   canChangeFranchiseType: access.canChangeFranchiseType,
    // },
    // shortcuts,
  };
};

const findLoginIdentity = async (mobile, roleName) => {
  const identities = await findIdentitiesByMobile(mobile, roleName);

  if (identities.length === 0) {
    throw createAppError(APP_ERRORS.INVALID_LOGIN);
  }

  const activeIdentities = identities.filter((identity) => identity.active);

  if (activeIdentities.length === 0) {
    throw createAppError(APP_ERRORS.INACTIVE_ACCOUNT);
  }

  // Never guess between two people
  if (activeIdentities.length > 1) {
    throw createAppError(APP_ERRORS.MULTIPLE_ACCOUNTS);
  }

  return activeIdentities[0];
};

// The mobile number and the requested role must match the same active record,
// whose role may log in to the CRM
const findLoginIdentityWithAccess = async (mobile, roleName) => {
  const identity = await findLoginIdentity(mobile, roleName);
  const access = identity.roleActive ? await getRoleAccess(identity.roleId) : null;

  if (!access || !access.canLogin) {
    throw createAppError(APP_ERRORS.NO_ACCESS);
  }

  return { identity, access };
};

// Step 1: the OTP is only sent to a mobile number that can log in with the role
const requestLoginOtp = async (mobile, roleName) => {
  await findLoginIdentityWithAccess(mobile, roleName);
  await sendLoginOtp(mobile);
};

// Step 2: the account is checked again before the OTP is consumed, then the session starts
const loginWithOtp = async (mobile, roleName, otp) => {
  const { identity, access } = await findLoginIdentityWithAccess(mobile, roleName);

  await verifyLoginOtp(mobile, otp);

  const [franchiseTypes, shortcuts] = await Promise.all([
    getIdentityFranchiseTypes(identity),
    getShortcuts(),
  ]);
  const sessionIdentity = { ...identity, franchiseTypes };
  const { token, expiresAt } = signToken(sessionIdentity);

  return {
    token,
    expiresAt,
    session: buildSessionPayload(sessionIdentity, access, shortcuts),
  };
};

// Verifies a JWT and reloads the user, so a deactivated user, role or role
// access loses access immediately. Returns { identity, access, expiresAt }.
const authenticateToken = async (token) => {
  const claims = verifyToken(token);
  const userId = claims.user_id;

  if (
    !isLoginRole(claims.role) ||
    !Number.isSafeInteger(userId) ||
    userId <= 0 ||
    claims.sub !== String(userId)
  ) {
    throw createAppError(APP_ERRORS.INVALID_SESSION);
  }

  const identity = await findIdentityById(userId, claims.role);
  const access =
    identity && identity.active && identity.roleActive
      ? await getRoleAccess(identity.roleId)
      : null;

  if (!identity || !access || !access.canLogin) {
    throw createAppError(APP_ERRORS.ACCESS_REVOKED);
  }

  const franchiseTypes = await getIdentityFranchiseTypes(identity);

  return {
    identity: { ...identity, franchiseTypes },
    access,
    expiresAt: new Date(claims.exp * 1000),
  };
};

// Session payload of an authenticated request ({ identity, access } from authenticateToken)
const getCurrentSession = async ({ identity, access }) => {
  const shortcuts = await getShortcuts();

  return buildSessionPayload(identity, access, shortcuts);
};

module.exports = {
  requestLoginOtp,
  loginWithOtp,
  authenticateToken,
  getCurrentSession,
};
