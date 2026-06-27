# Security Guide

## Overview

This document outlines security best practices and guidelines for the nine-dashboard application. Following these guidelines helps ensure the security and integrity of the authentication system and user data.

## Environment Variables

### Required Environment Variables

The application requires the following environment variables to be configured:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
VITE_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"

# JWT Secret for session management
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# Director Account Password (required for bootstrap scripts)
DIRECTOR_PASSWORD="your-secure-director-password"

# Google Secret Manager Configuration (optional, for production)
FIREBASE_PRIVATE_KEY_SECRET_NAME="FIREBASE_PRIVATE_KEY"
FIREBASE_PRIVATE_KEY_SECRET_VERSION="latest"
```

### Setting Up Environment Variables

1. **Local Development:**
   - Copy `.env.example` to `.env`
   - Fill in the required values
   - Never commit `.env` to version control

2. **Production:**
   - Use Google Secret Manager for sensitive values
   - The `secrets.ts` module automatically fetches secrets from Secret Manager
   - Set `FIREBASE_PRIVATE_KEY_SECRET_NAME` to your secret name

## Authentication System

### Architecture

The authentication system consists of three layers:

1. **Server-Side** (`src/server/auth.ts`)
   - Firebase Admin SDK integration
   - JWT token generation
   - Bcrypt password hashing
   - Role-based access control

2. **Client-Side Service** (`src/lib/customAuth.ts`)
   - Authentication orchestration
   - Firebase custom token handling
   - Password migration detection
   - Error translation

3. **UI Component** (`src/components/AuthGate.tsx`)
   - Three-phase authentication flow
   - Real-time password validation
   - Migration state handling

### Authentication Flow

**Phase 1: Username Check**
- User enters Poppo ID
- System checks if account exists
- Determines if first-time login

**Phase 2a: Initial Password Setup** (first-time users only)
- User sets password with complexity requirements
- Password is hashed with bcrypt (12 rounds)
- Firebase Authentication user is created
- Custom claims are assigned

**Phase 2b: Standard Login** (returning users)
- User enters password
- System validates against bcrypt hash
- Legacy plaintext passwords are automatically migrated
- JWT token is issued

### Password Requirements

All passwords must meet the following complexity requirements:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number

### Role-Based Access Control

The system uses role-based access control with the following levels:

| Role | Level | Permissions |
|------|-------|-------------|
| Director | 5 | Full system access, user management |
| Head Admin | 4 | Administrative functions |
| Admin | 3 | Standard admin access |
| Manager/Agent | 2 | Team management |
| Host | 1 | Basic access |

### Account Suspension

Accounts can be suspended by setting `isActive: false` in the Firestore `users` collection. Suspended accounts:
- Cannot log in (returns 403 error)
- Are flagged in username check
- Must be reactivated by an admin

## Security Best Practices

### Password Management

1. **Never hardcode passwords**
   - All passwords must be in environment variables
   - Use strong, unique passwords
   - Rotate passwords regularly

2. **Password hashing**
   - All passwords are hashed with bcrypt (12 rounds)
   - Legacy plaintext passwords are automatically migrated
   - Never store plaintext passwords

3. **Director account**
   - Director password is set via `DIRECTOR_PASSWORD` environment variable
   - Use `npm run bootstrap` to initialize Director account
   - Use `npm run verify-director` to verify Director account status

### Firebase Security

1. **Service Account Keys**
   - Never commit service account keys
   - Use Google Secret Manager in production
   - Rotate keys regularly

2. **Custom Claims**
   - Custom claims define user roles and permissions
   - Claims are synced on login and password changes
   - Use `verify-director.ts` to fix claim issues

3. **Firestore Rules**
   - Review and update security rules regularly
   - Test rules in Firebase Console before deploying
   - Use least-privilege access patterns

### API Security

1. **Rate Limiting**
   - Login endpoints are rate-limited
   - Too many attempts result in 429 error
   - Wait 15 minutes before retrying

2. **Input Validation**
   - All inputs are validated server-side
   - Poppo IDs must be numeric
   - Passwords must meet complexity requirements

3. **Error Messages**
   - Generic error messages for security
   - Don't reveal if user exists (except in username check)
   - Log detailed errors server-side

### Session Management

1. **JWT Tokens**
   - Tokens expire after 7 days
   - Use `JWT_SECRET` environment variable
   - Change secret in production

2. **Logout**
   - Client-side token removal
   - Server-side session cleanup
   - Clear local storage

## Testing

### Manual Testing

Use the manual testing guide in `src/server/__tests__/auth.test.ts` to test authentication flows:

```bash
# Run the test suite (requires server to be running)
node -e "import('./src/server/__tests__/auth.test.ts').then(m => m.runAllTests())"
```

### Test Checklist

- [ ] Username validation (valid, invalid, non-existent)
- [ ] Password login (valid, invalid, missing)
- [ ] Password complexity (length, uppercase, number, match)
- [ ] Google Sign-In (authorized, unauthorized)
- [ ] Account suspension (check, login)
- [ ] Rate limiting (multiple attempts)
- [ ] Director account (login, claims)
- [ ] Session management (login, logout, verify)
- [ ] Password migration (plaintext to bcrypt)

## Incident Response

### Security Incident Checklist

1. **Identify the incident**
   - Review logs for suspicious activity
   - Check for unauthorized access
   - Identify affected accounts

2. **Contain the incident**
   - Suspend affected accounts
   - Rotate compromised credentials
   - Disable vulnerable endpoints

3. **Remediate**
   - Patch vulnerabilities
   - Update security rules
   - Implement additional monitoring

4. **Recover**
   - Restore from backups if needed
   - Verify system integrity
   - Monitor for recurrence

### Common Security Issues

**Compromised Passwords**
1. Suspend affected accounts
2. Force password reset
3. Review access logs
4. Notify users

**Unauthorized Access**
1. Revoke JWT tokens
2. Rotate JWT_SECRET
3. Review custom claims
4. Update security rules

**Data Breach**
1. Identify exposed data
2. Notify affected users
3. Review compliance requirements
4. Implement additional controls

## Monitoring

### Key Metrics to Monitor

- Failed login attempts per user
- Rate limit violations
- Suspicious IP addresses
- Unusual access patterns
- Failed API calls

### Logging

The application logs the following security events:
- Login attempts (success/failure)
- Password changes
- Account suspensions
- Custom claim changes
- Google Sign-In events

Review logs regularly for suspicious activity.

## Compliance

### Data Protection

- User passwords are hashed with bcrypt
- Personal data is stored in Firestore
- Access is role-based
- Audit logs are maintained

### Access Control

- Minimum privilege principle
- Regular access reviews
- Account deprovisioning
- Session timeouts

## References

- [Firebase Security Best Practices](https://firebase.google.com/docs/security)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

## Support

For security issues or questions:
1. Review this guide
2. Check the Git forensic implementation plan
3. Consult the authentication test suite
4. Contact the security team

---

**Last Updated:** June 27, 2026
**Version:** 1.0
