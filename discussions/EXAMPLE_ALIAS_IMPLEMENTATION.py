"""
Example implementation showing how to add environment variable aliases
to support both Weaver and MCP naming conventions
"""

import os


class ProxmoxManager:
    """Example of supporting both naming conventions with aliases."""

    def __init__(self):
        """Initialize Proxmox connection with support for both naming conventions."""

        # Support both naming conventions - check Weaver names first, then MCP names
        self.host = os.getenv("PROXMOX_HOST")
        self.user = os.getenv("PROXMOX_USER", "root@pam")

        # TOKEN_ID (Weaver) or TOKEN_NAME (MCP)
        self.token_name = os.getenv("PROXMOX_TOKEN_ID") or os.getenv(
            "PROXMOX_TOKEN_NAME"
        )

        # TOKEN_SECRET (Weaver) or TOKEN_VALUE (MCP)
        self.token_value = os.getenv("PROXMOX_TOKEN_SECRET") or os.getenv(
            "PROXMOX_TOKEN_VALUE"
        )

        self.verify_ssl = os.getenv("PROXMOX_VERIFY_SSL", "false").lower() == "true"

        # Validation with helpful error message showing both options
        if not all([self.host, self.token_name, self.token_value]):
            raise ValueError(
                "Missing required environment variables:\n"
                "  - PROXMOX_HOST\n"
                "  - PROXMOX_TOKEN_NAME or PROXMOX_TOKEN_ID\n"
                "  - PROXMOX_TOKEN_VALUE or PROXMOX_TOKEN_SECRET"
            )

        # Rest of initialization...


# Example of environment variable documentation
ENV_VAR_DOCUMENTATION = """
## Environment Variables

### Required Variables
- `PROXMOX_HOST`: Your Proxmox server address (e.g., '192.168.1.100' or 'proxmox.example.com')

### Authentication (supports both naming conventions)
You can use either set of variable names:

**MCP Convention (current):**
- `PROXMOX_TOKEN_NAME`: Your API token name
- `PROXMOX_TOKEN_VALUE`: Your API token value

**Weaver Convention (for compatibility):**
- `PROXMOX_TOKEN_ID`: Your API token ID (alias for TOKEN_NAME)
- `PROXMOX_TOKEN_SECRET`: Your API token secret (alias for TOKEN_VALUE)

### Optional Variables
- `PROXMOX_USER`: Username (defaults to 'root@pam')
- `PROXMOX_VERIFY_SSL`: SSL verification (defaults to 'false')
- `LOG_LEVEL`: Logging level (defaults to 'INFO')

### Example Usage

Using MCP naming:
```bash
export PROXMOX_HOST="192.168.1.100"
export PROXMOX_TOKEN_NAME="api-token"
export PROXMOX_TOKEN_VALUE="secret-value"
```

Using Weaver naming:
```bash
export PROXMOX_HOST="192.168.1.100"
export PROXMOX_TOKEN_ID="api-token"
export PROXMOX_TOKEN_SECRET="secret-value"
```
"""


# Example showing why raw JSON is better for AI
def example_ai_consumption():
    """
    Demonstrates why raw JSON is superior for AI/LLM consumption
    """

    # Raw JSON response (what we keep)
    raw_response = {
        "vmid": 100,
        "name": "web-server",
        "mem": 2147483648,  # bytes
        "maxmem": 4294967296,  # bytes
        "cpu": 0.156,  # decimal percentage
        "uptime": 259200,  # seconds
        "netin": 1073741824,  # bytes
        "netout": 536870912,  # bytes
    }

    # Examples of how AI can dynamically format this data:

    # 1. Technical report
    ai_technical = """
    VM 100 (web-server) Status:
    - Memory: 2,147,483,648 bytes / 4,294,967,296 bytes (50.0%)
    - CPU Load: 15.6%
    - Uptime: 259,200 seconds
    - Network I/O: IN: 1,073,741,824 bytes, OUT: 536,870,912 bytes
    """

    # 2. User-friendly summary
    ai_friendly = """
    Your web server is running smoothly:
    ✓ Using half of its available memory (2 GB of 4 GB)
    ✓ CPU usage is low at 16%
    ✓ Been running for 3 days
    ✓ Network traffic: Downloaded 1 GB, Uploaded 512 MB
    """

    # 3. Alert generation
    if raw_response["mem"] / raw_response["maxmem"] > 0.8:
        ai_alert = "⚠️ Memory usage is high at 80%! Consider upgrading."

    # 4. Comparison and calculations
    memory_percentage = (raw_response["mem"] / raw_response["maxmem"]) * 100
    days_up = raw_response["uptime"] / 86400

    # 5. Different language/locale formatting
    ai_localized = f"Mémoire: {raw_response['mem'] / 1024**3:.2f} Go"

    return """
    With raw JSON data, AI can:
    - Perform calculations (memory at {memory_percentage:.1f}%)
    - Generate alerts based on thresholds
    - Format for different audiences
    - Localize to different languages
    - Create visualizations
    - Track trends over time
    """.format(
        memory_percentage=memory_percentage
    )
