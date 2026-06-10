# Pull Request

## Summary

- What changed:
- Why:

## Self Data Policy Checklist

- [ ] For connected-user data, I used a self endpoint (`/me`) and not a global users listing.
- [ ] I did not introduce `list users + find/filter` logic to derive current user information.
- [ ] If a users list was required, it is admin-scoped and server-side bounded.
- [ ] For dropdowns/filters, I used a minimal endpoint (for example `/api/v1/users/options`) when possible.
- [ ] Any user API call added/changed is centralized in `lib/api.ts` and follows existing security conventions.

## Verification

- [ ] `npm run lint`
- [ ] `npm run build`
