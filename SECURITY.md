# Security

[Version française](SECURITY.fr.md)

## Reporting a vulnerability

Never describe a vulnerability in an issue, a discussion or a pull request: everything there is public.

Two private channels:

- the **Security** tab of this GitHub repository, "Report a vulnerability" button;
- an email to pro.allali.ilies@gmail.com.

If you can, say what is affected (address, API route, file), the steps to reproduce and the impact you observe. A short, precise report is enough. English or French, as you prefer.

## Scope

- The public instance [parenthese.io](https://parenthese.io): the website, the app and its API.
- The code in this repository, including the self-hosting setup (`docker-compose.yml`, Docker images, nginx configuration).

A self-hosted instance run by someone else is the responsibility of its administrator. If the vulnerability comes from the code, it is in scope.

On parenthese.io, test only with your own account and your own trees. Do not access other families' data, and no denial of service or large automated tests.

## Response time

Parenthèse is maintained by one person. You will get an acknowledgment as soon as possible, usually within a week. Serious vulnerabilities come before everything else. Once the fix is published, the vulnerability can be described publicly, leaving self-hosters time to update.

Only the latest version of the `main` branch receives fixes.
