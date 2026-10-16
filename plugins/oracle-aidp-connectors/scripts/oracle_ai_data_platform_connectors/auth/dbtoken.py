"""IAM DB-Token issuance helpers for AIDP notebooks.

Executor-side token refresh is an advanced path: it only works when each
executor can resolve OCI auth/config and writes token material to the same
executor-local directory used by the JDBC options. Prefer driver-issued tokens
for short jobs or a platform-supported credential pattern for long jobs.

Usage from a notebook:

    from oracle_ai_data_platform_connectors.auth.dbtoken import (
        generate_db_token, refresh_on_executors,
    )

    # Driver-side: write the initial token to a unique /tmp/aidp-dbtoken-* dir
    token_path = generate_db_token(
        compartment_ocid=os.environ["ATP_COMPARTMENT_OCID"],
    )

    # Set spark JDBC options to use it
    jdbc_opts = {
        "driver": "oracle.jdbc.OracleDriver",
        "oracle.jdbc.tokenAuthentication": "OCI_TOKEN",
        "oracle.jdbc.tokenLocation": token_path,
    }
"""

from __future__ import annotations

import os
import tempfile
import time
from pathlib import Path
from typing import Any, Callable, Optional


_DEFAULT_REFRESH_AFTER_SECONDS = 25 * 60  # tokens are 1h, refresh at 25 min


def generate_db_token(
    compartment_ocid: str,
    target_dir: Optional[str] = None,
    config: Optional[dict] = None,
    signer: Optional[Any] = None,
    region: Optional[str] = None,
) -> str:
    """Issue an IAM DB token and write it to ``<target_dir>/token``.

    Args:
        compartment_ocid: Compartment OCID for the DB-token scope. The OCI
            data-plane endpoint requires
            ``urn:oracle:db::id::<COMPARTMENT_OCID>``.
        target_dir: Directory under /tmp where the token file lands. Must be
            under /tmp for the JDBC driver to read it (FUSE caveat). If omitted,
            a unique ``/tmp/aidp-dbtoken-*`` directory is created for this run.
        config: Optional OCI config dict (from ``oci.config.from_file`` or
            ``from_inline_pem``). If omitted, the helper falls back to the
            default OCI profile.
        signer: Optional explicit OCI signer. Mutually-exclusive-ish with
            ``config`` (oci SDK accepts both for some clients).
        region: Optional region override for the data-plane client.

    Returns:
        The directory containing the token file (the value you pass to
        ``oracle.jdbc.tokenLocation``). NOT the path to the token file
        itself - the Oracle JDBC driver wants the directory.
    """
    import oci  # imported lazily so unit tests don't need oci installed
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa

    if target_dir is None:
        target_dir = tempfile.mkdtemp(prefix="aidp-dbtoken-", dir="/tmp")
        os.chmod(str(target_dir), 0o755)

    _validate_tmp_dir(target_dir)

    Path(target_dir).mkdir(parents=True, exist_ok=True)
    os.chmod(str(target_dir), 0o755)

    if config is None and signer is None:
        config = oci.config.from_file()
    if region:
        if config is None:
            config = {}
        config = {**config, "region": region}

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("ascii")
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    client_kwargs: dict = {}
    if config is not None:
        client_kwargs["config"] = config
    if signer is not None:
        client_kwargs["signer"] = signer

    client = oci.identity_data_plane.DataplaneClient(**client_kwargs)
    details = oci.identity_data_plane.models.GenerateScopedAccessTokenDetails(
        scope=f"urn:oracle:db::id::{compartment_ocid}",
        public_key=public_pem,
    )
    response = client.generate_scoped_access_token(
        generate_scoped_access_token_details=details,
    )
    token = response.data.token

    # Oracle JDBC's OCI_TOKEN auth requires BOTH files in the same directory:
    #   <target_dir>/token              - the scoped JWT
    #   <target_dir>/oci_db_key.pem    - the matching private key (proof of possession)
    # Driver looks for these names by convention; do not rename.
    _write_world_readable(Path(target_dir) / "token", token.encode("utf-8"))
    _write_world_readable(Path(target_dir) / "oci_db_key.pem", private_pem)
    return target_dir


def _validate_tmp_dir(target_dir: str) -> None:
    target_str = str(target_dir).replace("\\", "/").rstrip("/")
    if target_str != "/tmp" and not target_str.startswith("/tmp/"):
        raise ValueError(
            "dbtoken target_dir must be under /tmp; /Workspace breaks JDBC"
        )


def refresh_on_executors(
    spark: Any,
    compartment_ocid: str,
    target_dir: Optional[str] = None,
    refresh_after_seconds: int = _DEFAULT_REFRESH_AFTER_SECONDS,
) -> Callable[[Any], Any]:
    """Return a mapPartitions-callable that refreshes the DB token per executor.

    This is an advanced escape hatch for long-running Spark jobs. It assumes
    each executor can resolve OCI auth/config and can write to the same
    executor-local ``target_dir`` already configured as
    ``oracle.jdbc.tokenLocation``. Do not use it as the default path.

    Example:

        refresh = refresh_on_executors(spark, compartment_ocid, "/tmp/aidp-dbtoken-job")
        result = (
            df.rdd.mapPartitions(lambda part: refresh(part))
                  .toDF()
        )

    Args:
        spark: SparkSession (kept for API symmetry).
        compartment_ocid: same as ``generate_db_token``.
        target_dir: explicit executor-local token directory already used by
            the JDBC tokenLocation option.
        refresh_after_seconds: refresh threshold; defaults to 25 min.

    Returns:
        A function suitable for ``rdd.mapPartitions`` that ensures a token
        younger than ``refresh_after_seconds`` exists in ``target_dir``
        before the partition's user code runs.
    """
    if target_dir is None:
        raise ValueError(
            "refresh_on_executors requires an explicit target_dir that matches "
            "the JDBC oracle.jdbc.tokenLocation setting"
        )

    # Capture state in closure rather than relying on broadcast; each executor
    # process maintains its own (timestamp, path) pair.
    _state = {"last_refresh": 0.0}

    def ensure_token(partition_iter):
        now = time.time()
        if now - _state["last_refresh"] > refresh_after_seconds:
            generate_db_token(
                compartment_ocid=compartment_ocid,
                target_dir=target_dir,
            )
            _state["last_refresh"] = now
        for row in partition_iter:
            yield row

    return ensure_token


def _write_world_readable(path: Path, data: bytes) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    fd = os.open(str(path), flags, 0o644)
    try:
        os.write(fd, data)
    finally:
        os.close(fd)
