# Contributing

Thanks for helping improve HUMMBL.

## How to Contribute

1. Fork the repo and create a feature branch.
2. Make your changes with clear, focused commits.
3. Ensure tests pass locally for the API:

   ```bash
   cd api
   npm test
   ```

4. Open a pull request with a short summary and test notes.

## Code Review

- All changes require review by the code owners listed in `.github/CODEOWNERS`.
- Keep PRs small and scoped to one purpose.
- If your change affects behavior, include tests.

## Reporting Issues

- Security issues: see `SECURITY.md`.
- Bugs/features: open a GitHub issue with repro steps or a clear use case.

## Style & Quality

- Use existing conventions.
- Prefer explicit, readable code over cleverness.
- Avoid unrelated refactors in the same PR.
