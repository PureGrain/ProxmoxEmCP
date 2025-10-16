import os

def test_env_vars():
    assert os.getenv("PROXMOX_HOST") is not None, "PROXMOX_HOST should be set"
    assert os.getenv("PROXMOX_TOKEN_NAME") is not None, "PROXMOX_TOKEN_NAME should be set"
    assert os.getenv("PROXMOX_TOKEN_VALUE") is not None, "PROXMOX_TOKEN_VALUE should be set"
