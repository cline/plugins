#!/usr/bin/env python3
"""
Forge App Deployment Automation Script

This script automates the complete Forge app deployment process:
1. Validates prerequisites (Node.js, Forge CLI)
2. Installs dependencies
3. Validates manifest
4. Registers app (if needed)
5. Deploys to Forge
6. Installs on Jira site

Usage:
    python deploy_forge_app.py --app-dir /path/to/app --site https://company.atlassian.net
"""

import os
import sys
import subprocess
import json
import argparse
import time
import shlex
from pathlib import Path


class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(message):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{message.center(80)}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}\n")


def print_step(step_num, message):
    print(f"{Colors.OKCYAN}{Colors.BOLD}Step {step_num}: {message}{Colors.ENDC}")


def print_success(message):
    print(f"{Colors.OKGREEN}OK {message}{Colors.ENDC}")


def print_error(message):
    print(f"{Colors.FAIL}ERROR {message}{Colors.ENDC}")


def print_warning(message):
    print(f"{Colors.WARNING}WARN {message}{Colors.ENDC}")


def run_command(cmd, cwd=None, capture_output=True, check=True):
    """Run a command and return the result."""
    display = shlex.join(cmd) if isinstance(cmd, list) else cmd
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=capture_output,
            text=True,
            check=check
        )
        return result
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {display}")
        if e.stdout and e.stdout.strip():
            print(f"\n--- stdout ---\n{e.stdout.strip()}")
        if e.stderr and e.stderr.strip():
            print(f"\n--- stderr ---\n{e.stderr.strip()}")
        raise


def check_node():
    """Check if Node.js is installed and get version."""
    try:
        result = run_command(["node", "-v"])
        version = result.stdout.strip()
        print_success(f"Node.js {version} found")
        return True
    except:
        print_error("Node.js not found. Please install Node.js 22 LTS")
        return False


def check_forge_cli():
    """Check if Forge CLI is installed and get version."""
    try:
        result = run_command(["forge", "--version"])
        version = result.stdout.strip().split('\n')[0]  # Get first line (version)
        print_success(f"Forge CLI {version} found")
        return True
    except:
        print_error("Forge CLI not found. Install with: npm install -g @forge/cli")
        return False


def check_forge_login():
    """Check if user is logged into Forge."""
    try:
        result = run_command(["forge", "whoami"])
        # Parse output to get email
        lines = result.stdout.strip().split('\n')
        for line in lines:
            if '@' in line and 'Logged in as' in line:
                print_success(f"Logged in to Forge: {line}")
                return True
        return False
    except:
        print_error("Not logged into Forge. Run: forge login")
        return False


def install_dependencies(app_dir):
    """Install npm dependencies."""
    print("Installing dependencies (this may take a few minutes)...")
    result = run_command(["npm", "install"], cwd=app_dir)
    print_success("Dependencies installed")
    return True


def validate_manifest(app_dir):
    """Validate manifest.yml using forge lint."""
    print("Validating manifest.yml...")
    result = run_command(["forge", "lint"], cwd=app_dir)
    print_success("Manifest is valid")
    return True


def check_app_registered(app_dir):
    """Check if app is already registered (has an app ID in manifest)."""
    manifest_path = Path(app_dir) / "manifest.yml"
    if not manifest_path.exists():
        return False
    
    with open(manifest_path, 'r') as f:
        content = f.read()
        # Check if there's a valid app ID (not placeholder)
        if 'id:' in content and 'will-be-generated' not in content.lower() and 'your-app-id' not in content.lower():
            return True
    return False


def register_app(app_dir, developer_space_id=None):
    """
    Register the app with Forge.
    
    Note: This is the tricky part - forge register is interactive.
    We'll try to use environment variables or pass space ID if available.
    """
    print_warning("App needs to be registered with Forge")
    
    if developer_space_id:
        # Try non-interactive registration with space ID
        print(f"Attempting registration with Developer Space ID: {developer_space_id}")
        try:
            # This may not work - forge register might not support --space-id
            cmd = ["forge", "register", "--developer-space-id", developer_space_id]
            result = run_command(cmd, cwd=app_dir, check=False)
            if result.returncode == 0:
                print_success("App registered successfully")
                return True
        except:
            pass
    
    print_warning("forge register requires interactive input")
    print_warning("Please run this command manually in your terminal:")
    print(f"  cd {app_dir}")
    print(f"  forge register")
    print_warning("Then run this script again.")
    return False


def deploy_app(app_dir, environment="development"):
    """Deploy the app to Forge."""
    print(f"Deploying to {environment} environment...")
    cmd = ["forge", "deploy", "--non-interactive", "-e", environment]
    result = run_command(cmd, cwd=app_dir)
    print_success(f"Deployed to {environment}")
    return True


def install_app(app_dir, site_url, product="jira", environment="development", upgrade=False):
    """Install the app on the specified site."""
    print(f"Installing app on {site_url}...")
    cmd = [
        "forge", "install", "--non-interactive",
        "--site", site_url,
        "--product", product,
        "-e", environment,
    ]
    if upgrade:
        cmd.extend(["--upgrade", "--confirm-scopes"])
    result = run_command(cmd, cwd=app_dir)
    print_success(f"Installed on {site_url}")
    return True


def detect_required_products(app_dir):
    """
    Parse manifest.yml scopes to determine which Atlassian products
    the app needs to be installed on.
    Returns a set of product names (e.g. {'jira', 'confluence'}).
    """
    manifest_path = Path(app_dir) / "manifest.yml"
    if not manifest_path.exists():
        return set()

    with open(manifest_path, 'r') as f:
        content = f.read()

    products = set()

    jira_patterns = [
        'read:jira-work', 'write:jira-work',
        'read:jira-user', 'manage:jira-project',
        'manage:jira-configuration', 'manage:jira-data-provider',
        'manage:jira-webhook',
    ]
    confluence_patterns = [
        'read:confluence-content', 'write:confluence-content',
        'read:confluence-space', 'write:confluence-space',
        'read:confluence-user', 'read:confluence-groups',
        'read:page:confluence', 'write:page:confluence',
        'read:space:confluence',
    ]

    for pat in jira_patterns:
        if pat in content:
            products.add('jira')
            break

    for pat in confluence_patterns:
        if pat in content:
            products.add('confluence')
            break

    # Also detect from module keys
    if 'jira:' in content or 'jira:issuePanel' in content or 'jira:projectPage' in content:
        products.add('jira')
    if 'macro:' in content or 'confluence:' in content:
        products.add('confluence')

    return products


def get_app_logs(app_dir, environment="development", limit=20):
    """Get recent app logs."""
    print("Fetching recent logs...")
    cmd = ["forge", "logs", "-e", environment, "--limit", str(limit)]
    result = run_command(cmd, cwd=app_dir, capture_output=True)
    print(result.stdout)


def main():
    parser = argparse.ArgumentParser(
        description="Automate Forge app deployment",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Deploy to development environment
  python deploy_forge_app.py --app-dir ./my-forge-app --site https://company.atlassian.net
  
  # Deploy to production
  python deploy_forge_app.py --app-dir ./my-forge-app --site https://company.atlassian.net --env production
  
  # Skip installation step (deploy only)
  python deploy_forge_app.py --app-dir ./my-forge-app --deploy-only
        """
    )
    
    parser.add_argument("--app-dir", required=True, help="Path to Forge app directory")
    parser.add_argument("--site", help="Atlassian site URL (e.g., https://company.atlassian.net)")
    parser.add_argument("--product", default="jira", help="Product to install on (default: jira)")
    parser.add_argument("--env", default="development", help="Environment (default: development)")
    parser.add_argument("--developer-space-id", help="Developer Space ID for registration")
    parser.add_argument("--deploy-only", action="store_true", help="Deploy only, skip installation")
    parser.add_argument("--skip-deps", action="store_true", help="Skip npm install")
    parser.add_argument("--show-logs", action="store_true", help="Show logs after deployment")
    parser.add_argument("--upgrade", action="store_true", help="Pass --upgrade to forge install when scopes changed")
    parser.add_argument("--include-detected-products", action="store_true",
                        help="Install on products inferred from manifest scopes/modules in addition to --product")
    
    args = parser.parse_args()
    
    app_dir = Path(args.app_dir).resolve()
    
    if not app_dir.exists():
        print_error(f"App directory not found: {app_dir}")
        sys.exit(1)
    
    print_header("Forge App Deployment Automation")
    print(f"App Directory: {app_dir}")
    print(f"Environment: {args.env}")
    if not args.deploy_only:
        print(f"Target Site: {args.site}")
        print(f"Product: {args.product}")
    
    # Step 1: Check prerequisites
    print_step(1, "Checking Prerequisites")
    if not check_node():
        sys.exit(1)
    if not check_forge_cli():
        sys.exit(1)
    if not check_forge_login():
        sys.exit(1)
    
    # Step 2: Install dependencies
    if not args.skip_deps:
        print_step(2, "Installing Dependencies")
        try:
            install_dependencies(app_dir)
        except Exception as e:
            print_error(f"Failed to install dependencies: {e}")
            sys.exit(1)
    else:
        print_step(2, "Skipping dependency installation")
    
    # Step 3: Validate manifest
    print_step(3, "Validating Manifest")
    try:
        validate_manifest(app_dir)
    except Exception as e:
        print_error(f"Manifest validation failed: {e}")
        sys.exit(1)
    
    # Step 4: Register app (if needed)
    print_step(4, "Checking App Registration")
    if check_app_registered(app_dir):
        print_success("App is already registered")
    else:
        if not register_app(app_dir, args.developer_space_id):
            print_error("App registration required. Please register manually.")
            sys.exit(1)
    
    # Step 5: Deploy
    print_step(5, "Deploying to Forge")
    try:
        deploy_app(app_dir, args.env)
    except Exception as e:
        print_error(f"Deployment failed: {e}")
        sys.exit(1)
    
    # Step 6: Install (if not deploy-only)
    installed_products = []
    if not args.deploy_only:
        # Always get site URL - prompt if not provided
        if args.site:
            print_success(f"Using site: {args.site}")
        else:
            print("\nWARN  Site URL is required for installation")
            args.site = input(f"Enter {args.product.capitalize()} site URL (e.g., https://company.atlassian.net): ").strip()
        
        if not args.site:
            print_error("Site URL is required for installation")
            sys.exit(1)
        
        required_products = {args.product}
        detected_products = detect_required_products(app_dir)
        extra_products = detected_products - required_products
        if extra_products:
            print_warning(
                "Manifest also appears to reference: "
                + ", ".join(sorted(extra_products))
                + ". Re-run with --include-detected-products only after the user approves those installs."
            )
            if args.include_detected_products:
                required_products.update(extra_products)

        print_step(6, "Installing on Atlassian Site")

        if len(required_products) > 1:
            print(f"  Detected cross-product scopes - installing on: {', '.join(sorted(required_products))}")

        for product in sorted(required_products):
            try:
                install_app(app_dir, args.site, product, args.env, args.upgrade)
                installed_products.append(product)
            except Exception as e:
                print_error(f"Installation on {product} failed: {e}")
                sys.exit(1)
    
    # Show logs if requested
    if args.show_logs:
        print_step(7, "Recent Logs")
        get_app_logs(app_dir, args.env)
    
    # Success!
    print_header("Deployment Complete!")

    if args.deploy_only:
        print_success("Your Forge app is now deployed!")
        print(f"\n{Colors.BOLD}Next step:{Colors.ENDC}")
        print(f"  Install the app by re-running with --site <your-site-url>")
    else:
        products_str = ' and '.join(installed_products) if installed_products else args.product
        print_success(f"Your Forge app is deployed and installed on {products_str}!")
        print(f"\n{Colors.BOLD}Next steps:{Colors.ENDC}")
        print(f"  1. Go to {args.site}")
        print(f"  2. Open your app in {products_str.capitalize()}")
        print(f"  3. Look for your app!")

    print(f"\n{Colors.BOLD}Useful commands:{Colors.ENDC}")
    print(f"  View logs:  forge logs -e {args.env} --limit 50")
    print(f"  Tunnel:     forge tunnel")
    site_flag = f" --site {args.site}" if args.site else ""
    print(f"  Redeploy:   python {sys.argv[0]} --app-dir {app_dir}{site_flag} --skip-deps")
    print()


if __name__ == "__main__":
    main()
