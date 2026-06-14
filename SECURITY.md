# Security Policy

## Supported versions

`agents-md-cookbook` ships two npm packages — `agents-md-lint` and
`agents-md-migrate` — plus the `AGENTS.md` templates in this repository.
Security fixes land on the latest published release.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a vulnerability

Please report security vulnerabilities **privately** — do not open a public
issue, pull request, or discussion for them.

1. Open the
   [Security tab](https://github.com/Taiizor/agents-md-cookbook/security) of
   this repository.
2. Click **Report a vulnerability** to start a private advisory through
   GitHub's
   [private vulnerability reporting](https://docs.github.com/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability).
3. Include a description, reproduction steps, the affected package or template,
   and the impact you observed.

You can expect an initial response within **7 days**. When a fix is ready we
publish a new release and credit you in the advisory unless you prefer to stay
anonymous.

## Scope

In scope:

- The `agents-md-lint` and `agents-md-migrate` packages under `packages/`.
- The composite GitHub Action defined in `action.yml`.
- Build and CI configuration that could affect published artifacts.

Out of scope:

- Vulnerabilities in third-party tools that merely *read* `AGENTS.md`.
- The content of example projects or downstream repositories that copy a
  template.

## Supply-chain hardening

This repository enables Dependabot security and version updates, secret
scanning with push protection, private vulnerability reporting, and CodeQL
code scanning on every push and pull request to `main`.
