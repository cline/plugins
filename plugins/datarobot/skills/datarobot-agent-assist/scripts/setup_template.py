#!/usr/bin/env python3
# Copyright (c) 2026 DataRobot, Inc. All rights reserved.
# SPDX-License-Identifier: Apache-2.0

"""Setup and initialize a DataRobot agent application template.

This script performs initial setup for a DataRobot agent application template by:
1. Creating a new .env file with the specified LLM model placeholder
2. Running: 'dr dotenv setup --yes' to populate DataRobot settings
3. Initializing a Pulumi stack with the generated passphrase
4. Running the template's start-non-interactive task

Usage:
    python setup_template.py --llm-model <model-name> [--target-dir <directory>] --confirm-setup

This is a mutating setup helper. Only run it after presenting the exact
commands and file effects to the user and receiving explicit approval.
"""

import os
import sys
import argparse
import subprocess
import secrets
import base64
from pathlib import Path
from typing import Tuple

from env_utils import read_env_variable


def generate_random_secret(length: int = 32) -> str:
    """
    Generate a cryptographically random base64-encoded secret.

    Args:
        length: Desired length of the final secret string

    Returns:
        A base64 URL-safe encoded string truncated to specified length
    """
    random_bytes = secrets.token_bytes(length)
    encoded = base64.urlsafe_b64encode(random_bytes).decode("ascii")
    return encoded[:length]


def create_env_file(target_dir: Path, llm_default_model: str) -> Tuple[bool, str]:
    """
    Create .env file with LLM_DEFAULT_MODEL configuration.

    Args:
        target_dir: Directory where .env file should be created
        llm_default_model: Value for LLM_DEFAULT_MODEL

    Returns:
        Tuple of (success, message)
    """
    env_file = target_dir / ".env"

    try:
        if env_file.exists():
            return (
                False,
                f"Refusing to overwrite existing {env_file}. Move it aside or update it manually.",
            )

        print(f"Creating .env file in {target_dir}")

        # Write the .env file
        with open(env_file, "w") as f:
            f.write("DATAROBOT_ENDPOINT=\n")
            f.write("DATAROBOT_API_TOKEN=\n")
            f.write(f'LLM_DEFAULT_MODEL="{llm_default_model}"\n')

        print(f'OK Created .env file with LLM_DEFAULT_MODEL="{llm_default_model}"')
        return True, f"Created {env_file}"

    except Exception as e:
        error_msg = f"Failed to create .env file: {str(e)}"
        print(f"Error: {error_msg}")
        return False, error_msg


def initialize_pulumi(
    target_dir: Path, pulumi_passphrase: str = "", timeout: int = 300
) -> Tuple[bool, str]:
    """
    Initialize Pulumi stack with a passphrase from .env or generated.

    Args:
        target_dir: Directory where Pulumi command should be executed
        pulumi_passphrase: Optional passphrase for Pulumi config encryption

    Returns:
        Tuple of (success, output)
    """
    # Check if infra subdirectory exists
    infra_dir = target_dir / "infra"
    work_dir = infra_dir if infra_dir.exists() else target_dir

    # Try to read PULUMI_CONFIG_PASSPHRASE from .env file, fall back to provided or generated passphrase
    env_file = target_dir / ".env"
    passphrase = pulumi_passphrase

    if env_file.exists():
        try:
            passphrase = read_env_variable(env_file, "PULUMI_CONFIG_PASSPHRASE")
            print("Using PULUMI_CONFIG_PASSPHRASE from .env file")
        except ValueError:
            # Variable not in .env, use the provided passphrase or generate one
            if not passphrase:
                passphrase = generate_random_secret()
            print(
                "PULUMI_CONFIG_PASSPHRASE not found in .env, using generated passphrase"
            )

    # Generate random string for stack name
    random_suffix = generate_random_secret(8)
    stack_name = f"dev-agent-assist-{random_suffix}"
    command = f"pulumi stack init {stack_name}"

    print(f"\nInitializing Pulumi stack in {work_dir}:")
    print(f"  Stack name: {stack_name}")
    print()

    env = os.environ.copy()
    env["DATAROBOT_CLI_NON_INTERACTIVE"] = "True"
    env["PULUMI_CONFIG_PASSPHRASE"] = passphrase

    try:
        result = subprocess.run(
            command,
            cwd=work_dir,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env=env,
        )

        # Combine stdout and stderr
        output = result.stdout
        if result.stderr:
            output += "\n" + result.stderr

        # Print the output
        print("Command output:")
        print("-" * 80)
        print(output)
        print("-" * 80)

        if result.returncode != 0:
            print(f"\nWarning: Command exited with code {result.returncode}")
            return False, output

        print("\nOK Pulumi stack initialized successfully")
        return True, output

    except subprocess.TimeoutExpired:
        error_msg = f"Pulumi initialization timed out after {timeout} seconds"
        print(f"Error: {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Failed to initialize Pulumi: {str(e)}"
        print(f"Error: {error_msg}")
        return False, error_msg


def run_command(command: str, target_dir: Path, timeout: int = 300) -> Tuple[bool, str]:
    """
    Run a shell command and capture its output.

    Args:
        command: Shell command to execute
        target_dir: Directory where command should be executed
        timeout: Timeout in seconds (default: 300)

    Returns:
        Tuple of (success, output)
    """
    print(f"\nExecuting command in {target_dir}:")
    print(f"  {command}")
    print()

    env = os.environ.copy()
    env["DATAROBOT_CLI_NON_INTERACTIVE"] = "True"

    try:
        result = subprocess.run(
            command,
            cwd=target_dir,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
            env=env,
        )

        # Combine stdout and stderr
        output = result.stdout
        if result.stderr:
            output += "\n" + result.stderr

        # Print the output
        print("Command output:")
        print("-" * 80)
        print(output)
        print("-" * 80)

        if result.returncode != 0:
            print(f"\nWarning: Command exited with code {result.returncode}")
            return False, output

        print("\nOK Command completed successfully")
        return True, output

    except subprocess.TimeoutExpired:
        error_msg = f"Command timed out after {timeout} seconds"
        print(f"Error: {error_msg}")
        return False, error_msg
    except Exception as e:
        error_msg = f"Failed to execute command: {str(e)}"
        print(f"Error: {error_msg}")
        return False, error_msg


def setup_and_run(
    llm_default_model: str, target_dir: Path, confirm_setup: bool = False
) -> int:
    """
    Create .env file and run required setup commands.

    Args:
        llm_default_model: Value for LLM_DEFAULT_MODEL in .env file
        target_dir: Target directory for operations

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    print("=" * 80)
    print("Setup and Run Script")
    print("=" * 80)
    print(f"Target directory: {target_dir}")
    print(f"LLM model: {llm_default_model}")
    print()

    if not confirm_setup:
        print("This helper creates .env, runs 'dr dotenv setup --yes',")
        print("initializes a Pulumi stack, and runs 'task start-non-interactive'.")
        print("Re-run with --confirm-setup only after explicit user approval.")
        return 2

    # Ensure target directory exists
    if not target_dir.exists():
        print(f"Error: Target directory does not exist: {target_dir}")
        return 1

    # Step 1: Create .env file
    success, message = create_env_file(target_dir, llm_default_model)
    if not success:
        return 1

    # Step 2: Run dr dotenv setup
    success, output = run_command("dr dotenv setup --yes", target_dir)
    if not success:
        # TODO: DR CLI non-interactive mode MUST be supported for this to work
        print("\nWarning: Command 'dr dotenv setup --yes' failed")
        print("See output above for details")
        return 1

    # Step 3: Initialize Pulumi stack
    success, output = initialize_pulumi(target_dir)
    if not success:
        print("\nWarning: Pulumi initialization failed")
        print("See output above for details")
        return 1

    # Step 4: Run task start-non-interactive
    success, output = run_command("task start-non-interactive", target_dir)
    if not success:
        print("\nWarning: Command 'task start-non-interactive' failed")
        print("See output above for details")
        return 1

    print("\n" + "=" * 80)
    print("OK All operations successful!")
    print("=" * 80)

    return 0


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Create .env file and run setup commands"
    )

    parser.add_argument(
        "--llm-model", required=True, help="LLM model to set in .env file"
    )

    parser.add_argument(
        "--target-dir",
        default=".",
        help="Target directory for operations (default: current directory)",
    )
    parser.add_argument(
        "--confirm-setup",
        action="store_true",
        help="Confirm the user approved .env creation, DataRobot CLI setup, Pulumi initialization, and task execution.",
    )

    args = parser.parse_args()

    target_dir = Path(args.target_dir).resolve()

    return setup_and_run(args.llm_model, target_dir, args.confirm_setup)


if __name__ == "__main__":
    sys.exit(main())
