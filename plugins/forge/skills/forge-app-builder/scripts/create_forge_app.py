#!/usr/bin/env python3
"""
Automated Forge App Creation Script
Wraps 'forge create' command with non-interactive mode and better error handling.

Run from the skill directory: python -m scripts.create_forge_app
"""

import subprocess
import sys
import argparse
import os

# Relative imports - scripts/ is a package; run as python -m scripts.create_forge_app from skill dir
from . import list_templates as list_templates_module

def validate_prerequisites():
    """Check if Forge CLI and Node.js are available"""
    try:
        subprocess.run(['forge', '--version'], capture_output=True, check=True)
        subprocess.run(['node', '-v'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def validate_template(template_name):
    """
    Validate that a template name is valid by checking against the official registry
    Returns (is_valid, suggestions) tuple
    """
    try:
        templates = list_templates_module.fetch_templates()
        template_names = [t['name'] for t in templates]
        
        if template_name in template_names:
            return True, None
        
        # Find similar templates for suggestion
        words = template_name.lower().replace('-', ' ').split()
        suggestions = []
        for valid_template in template_names:
            valid_words = valid_template.lower().replace('-', ' ').split()
            if any(word in valid_words for word in words):
                suggestions.append(valid_template)
        
        return False, suggestions[:5] if suggestions else template_names[:5]
        
    except Exception as e:
        print(f"WARN  Could not validate template: {e}")
        return True, None  # Assume valid if validation fails

def create_app(template, app_name, output_dir=None, dev_space_id=None):
    """
    Create a Forge app using 'forge create'
    
    Args:
        template: Template name (e.g., 'jira-issue-panel-ui-kit')
        app_name: Name for the new app
        output_dir: Parent directory where the app folder will be created.
                    The script cd's into this directory before running forge create
                    so the app folder is created as a subdirectory.
        dev_space_id: Developer space ID to use for non-interactive creation
    
    Returns:
        True if successful, False otherwise
    """
    
    if not validate_prerequisites():
        print("No Prerequisites missing. Ensure Forge CLI and Node.js v22+ are installed.")
        print("   Install: npm install -g @forge/cli")
        return False
    
    # Validate template
    is_valid, suggestions = validate_template(template)
    if not is_valid:
        print(f"No Template '{template}' is not recognized.")
        print(f"\nList Did you mean one of these?")
        for suggestion in suggestions:
            print(f"   - {suggestion}")
        print(f"\nTip To see all available templates, run:")
        print(f"   python -m scripts.list_templates --list")
        return False
    
    if not dev_space_id:
        print("No --dev-space-id is required for non-interactive creation.")
        print("   If you need to choose a developer space interactively, run:")
        print(f"   forge create --template {template} {app_name}")
        return False

    # Resolve the working directory for forge create.
    # We cd into output_dir (the parent) and let forge create the app subfolder,
    # instead of using forge's --directory flag which treats the path as the
    # full output path and fails if it already exists.
    cwd = os.path.abspath(output_dir) if output_dir else os.getcwd()

    if not os.path.isdir(cwd):
        print(f"No Parent directory does not exist: {cwd}")
        return False

    app_path = os.path.join(cwd, app_name)
    if os.path.exists(app_path):
        print(f"No Directory already exists: {app_path}")
        print(f"   Choose a different app name or remove the existing folder.")
        return False

    # Build command - no --directory flag; we run from the parent dir instead
    cmd = ['forge', 'create', '--template', template, app_name]
    
    if dev_space_id:
        cmd.extend(['--developer-space-id', dev_space_id])
        cmd.append('--accept-terms')
    
    try:
        print(f"\nPackage Creating Forge app: {app_name}")
        print(f"List Template: {template}")
        print(f"Path Location: {cwd}")
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)

        if result.returncode != 0:
            stderr = result.stderr.strip()
            stdout = result.stdout.strip()
            print(f"No Failed to create app (exit code {result.returncode})")
            if stdout:
                print(f"\n--- stdout ---\n{stdout}")
            if stderr:
                print(f"\n--- stderr ---\n{stderr}")
            return False
        
        print(f"Yes App created successfully at: {app_path}")
        print(f"Note Next steps:")
        print(f"   1. cd {app_path}")
        print(f"   2. npm install")
        print(f"   3. Customize the code")
        print(f"   4. Deploy with: forge deploy --non-interactive -e development")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"No Failed to create app: {e}")
        if e.stdout:
            print(f"\n--- stdout ---\n{e.stdout}")
        if e.stderr:
            print(f"\n--- stderr ---\n{e.stderr}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description='Automated Forge app creation with template validation'
    )
    parser.add_argument('--template', required=True, help='Forge template (e.g., jira-issue-panel-ui-kit)')
    parser.add_argument('--name', required=True, help='App name')
    parser.add_argument('--directory', help='Output directory (defaults to current directory)')
    parser.add_argument('--dev-space-id', help='Developer space ID for non-interactive creation')
    
    args = parser.parse_args()
    
    dev_space_id = args.dev_space_id
    print(f"Package Creating Forge app...\n")
    success = create_app(args.template, args.name, args.directory, dev_space_id)
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
