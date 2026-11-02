# Solaris Dev Shop

61 specialist workflows plus a chief-of-staff coordinator, with complete source, local recovery and evidence helpers, and a native solaris_intake tool.

## Install

From the official collection, once this entry is accepted:

```sh
cline plugin install solaris-dev-shop
```

The published source package is available directly:

```sh
cline plugin install solaris-dev-shop-cline@0.66.0 --npm --cwd .
```

For a local collection checkout:

```sh
cline plugin install ./plugins/solaris-dev-shop --cwd .
```

The manifest loads the complete product through the exact `solaris-dev-shop-cline@0.66.0` npm source-package dependency. Its declared entrypoint belongs to that installed package; Cline discovers the package's bundled skills. Source is not copied or reformatted in this collection. Exact reviewed source: https://github.com/Shaisolaris/solaris-dev-shop-cline/commit/eabe433f6e493966c8ecd72cc73e0c44294152a0 . Native adapter, verification and CI: https://github.com/Shaisolaris/solaris-dev-shop-plugins/pull/15 .

## Requirements

Cline CLI 3.0.73 or compatible SDK 0.0.95, Python 3.10+ and PyYAML on PATH for local helpers. This uses Cline's CLI/SDK/Kanban plugin support; it does not claim VS Code or JetBrains plugin support. Individual specialist workflows retain their own documented tools and approvals.

## Example

Ask Cline to call solaris_intake with request "review this code". The local coordinator returns one accountable code-review assignment. An underspecified request returns the legitimate clarification decision. It does not run specialist work or manufacture a completed review.

## Security and data

Installation fetches the complete source package from the npm registry. No lifecycle scripts are declared. Runtime registration adds the skills and one bounded local tool. The tool accepts only one request field, caps UTF-8 input at 32 KiB, invokes the pinned coordinator through execFile without a shell and after an argument separator, uses a 20 second timeout and a minimal child environment. It adds no lifecycle hooks, MCP servers, background jobs, provider settings or automatic permission approvals. It makes no model calls or network requests itself. Host permissions still apply.

Loading a workflow does not install or start Docker, fetch setup scripts, start services, or promote source changes. Specialist prerequisites require the task's existing authorization and the documented runtime checks.

The product preserves 1,200 canonical source files and original notices. Source packages are MIT licensed; all third-party notices stay in the dependency. Publisher: Solaris Technologies, https://solaristek.com. Support: https://github.com/Shaisolaris/solaris-dev-shop-plugins/issues .

## Published source

The complete source package is published at https://www.npmjs.com/package/solaris-dev-shop-cline/v/0.66.0 . Its public download matches the reviewed upload byte for byte. The official collection keyword becomes available when this entry is accepted. No npm policy is weakened to permit Git or arbitrary URL dependencies.
