# TASK 008 — Certificates, Credits & Payments


## Scop

Construiește certificate, credite și plăți.

## Build

- credit_types
- course_credits
- user_credits
- certificates
- certificate_security
- certificate_verification_logs
- payments
- subscriptions
- public certificate verification page

## Design references

- `16-certificate-system.png`
- `17-certificate-individual.png`
- `27-tech-stack-security.png`

## Reguli

- Certificatele au cod unic, QR și pagină publică.
- Creditele nu se leagă direct hardcoded de curs, ci prin `course_credits`.
