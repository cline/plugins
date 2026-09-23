"""Secret loading with an explicit fallback chain.

Order of resolution:
    1. OCI Vault secret (if ``OCI_VAULT_ID`` is set and the helper can resolve a
       secret with ``name`` inside it)
    2. Environment variable ``name`` (uppercase)
    3. ``default`` parameter (or raise KeyError if not provided)

The Vault path is optional. If no vault id is configured, the helper falls back
to env vars/defaults. If a vault id is configured and lookup fails, the helper
raises by default so notebook runs don't silently use the wrong secret source.
"""

from __future__ import annotations

import os
from typing import Any, Optional

_MISSING = object()


def get_secret(
    name: str,
    default: Any = _MISSING,
    vault_id: Optional[str] = None,
    vault_compartment_id: Optional[str] = None,
    best_effort_vault: bool = False,
) -> str:
    """Resolve ``name`` from OCI Vault -> env var -> default.

    Args:
        name: The secret name. Used both as the Vault secret name (case-sensitive)
            and, after uppercasing, as the env-var fallback.
        default: Returned if the secret can't be resolved anywhere. If left
            unspecified, a ``KeyError`` is raised instead.
        vault_id: Optional OCI Vault OCID override. Defaults to the
            ``OCI_VAULT_ID`` env var.
        vault_compartment_id: Optional compartment OCID for listing secrets.
            Defaults to ``OCI_VAULT_COMPARTMENT_OCID`` or the OCI config tenancy.
        best_effort_vault: If True, failed Vault lookups fall back to env/default.
            If False, a configured Vault that fails raises immediately.

    Returns:
        The resolved secret value as a string.

    Raises:
        KeyError: If no value can be resolved and ``default`` is not provided.
    """
    vault_id = vault_id or os.environ.get("OCI_VAULT_ID")
    vault_compartment_id = (
        vault_compartment_id
        or os.environ.get("OCI_VAULT_COMPARTMENT_OCID")
    )
    if vault_id:
        try:
            return _get_from_vault(name, vault_id, vault_compartment_id)
        except Exception as exc:
            if not best_effort_vault:
                raise RuntimeError(
                    f"failed to resolve secret {name!r} from OCI Vault {vault_id}"
                ) from exc

    env_value = os.environ.get(name.upper())
    if env_value is not None:
        return env_value

    if default is _MISSING:
        raise KeyError(
            f"secret {name!r} not found in OCI Vault, env, or default"
        )
    return default


def _get_from_vault(
    name: str,
    vault_id: str,
    vault_compartment_id: Optional[str] = None,
) -> str:
    """Look up ``name`` as a secret in the given OCI Vault.

    Imported lazily so unit tests don't need ``oci`` installed.
    """
    import base64
    import oci

    config = oci.config.from_file()
    vaults_client = oci.vault.VaultsClient(config)
    secrets_client = oci.secrets.SecretsClient(config)

    # The Vault contains many secrets; we have to list and filter by name.
    secrets = oci.pagination.list_call_get_all_results(
        vaults_client.list_secrets,
        compartment_id=vault_compartment_id or config.get("tenancy"),
        vault_id=vault_id,
    ).data
    match = next((s for s in secrets if s.secret_name == name), None)
    if match is None:
        raise KeyError(f"secret {name!r} not in vault {vault_id}")

    bundle = secrets_client.get_secret_bundle(secret_id=match.id).data
    content = bundle.secret_bundle_content.content  # base64-encoded
    return base64.b64decode(content).decode("utf-8")
