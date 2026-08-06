# CI/CD Workflow Examples

## Example 1: Set up GitLab CI/CD with review apps

User request: "Set up GitLab CI/CD for my application template with automated testing and manual review deployments"

Agent workflow:
1. Create `infra/scripts/` directory in project root: `mkdir -p infra`
2. Copy entire scripts directory: `cp -R <skill-path>/scripts infra/scripts`
3. Make scripts executable: `chmod +x infra/scripts/*.sh`
4. Copy CI/CD configs to standard locations:
   - GitLab: `cp infra/scripts/gitlab-ci.yml .gitlab-ci.yml`
   - GitHub: `cp infra/scripts/github-*.yml .github/workflows/`
5. Copy tasks from `infra/scripts/taskfile-snippets.yaml` to `infra/Taskfile.yaml`
   Then add an `includes` entry to the root `Taskfile.yml` pointing to `./infra/Taskfile.yaml` - do NOT paste tasks directly into root Taskfile.yml
6. Guide user to run `task infra:setup-github-secrets` or `task infra:setup-gitlab-vars`
7. If GitHub, guide user to run `task encrypt-secrets` to encrypt `.env` file
8. Generate `infra/README.md` tailored to GitLab + chosen Pulumi backend
9. Test pipeline with a sample PR/MR

## Example 2: Set up GitHub Actions with encrypted secrets

User request: "Configure GitHub Actions CI/CD with GPG-encrypted secrets and review deployments"

Agent workflow:
1. Create `infra/scripts/` directory: `mkdir -p infra && cp -R <skill-path>/scripts infra/scripts`
2. Make scripts executable: `chmod +x infra/scripts/*.sh`
3. Copy GitHub workflows: `cp infra/scripts/github-*.yml .github/workflows/`
4. Copy `infra/scripts/taskfile-snippets.yaml` to `infra/Taskfile.yaml`: `cp infra/scripts/taskfile-snippets.yaml infra/Taskfile.yaml`
   Add an `includes` entry for `./infra/Taskfile.yaml` to the root `Taskfile.yml` - do NOT paste tasks directly into root Taskfile.yml
5. Guide user to encrypt `.env` with `task infra:encrypt-secrets`
6. Guide user to set up GitHub secrets with `task infra:setup-github-secrets`
7. Add encrypted `.env.gpg` to repository
8. Generate `infra/README.md` tailored to GitHub Actions + chosen Pulumi backend
9. Test workflow with a sample pull request

## Example 3: Configure continuous delivery

User request: "Set up automatic deployment when changes are merged to main branch"

Agent workflow:
1. Add deployment job triggered on push to main branch
2. Configure Pulumi to use persistent stack name (e.g., "ci" or "prod")
3. Set up automatic stack selection and update
4. Configure deployment to run only on successful tests
5. Add deployment status notifications
6. Document the CD process for the team
