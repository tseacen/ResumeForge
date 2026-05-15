Audit the app for hallucination risks.

Check:

- whether generated bullets are traceable to source facts
- whether unsupported job keywords are added
- whether generated metrics are invented
- whether risky claims are blocked or marked as needs_user_validation
- whether tests cover these cases

Use RTK for commands when available.

Return a prioritized list of fixes.
