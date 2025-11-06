# title: Proxmox MCP Server Dockerfile
# author: PureGrain at SLA Ops, LLC
# author_url: https://github.com/PureGrain
# repo_url: https://github.com/PureGrain/ProxmoxMCP
# sponsor_url: https://github.com/sponsors/PureGrain
# license: MIT
# description: Docker container for Proxmox MCP Server using official MCP SDK

# Multi-stage build for Proxmox MCP Server

# Stage 1: Builder
FROM python:3.12-slim AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy application files
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Stage 2: Final Image
FROM alpine:latest

# Set working directory
WORKDIR /app

# Install runtime dependencies and create non-root user
RUN apk update && apk add --no-cache python3 py3-pip \
    && addgroup -g 1001 -S mcp \
    && adduser -u 1001 -S mcp -G mcp \
    && rm -rf /var/cache/apk/*

# Do NOT install Docker or containerd in the runtime image.
# Installing Docker/containerd in the image can introduce container runtime
# directories (e.g. /var/lib/containerd, /run/containerd/...) with
# permissive mode bits which are picked up by scanners like Docker Scout.
# Scanning and tools such as Docker Scout should run in CI, not in the runtime
# container. Avoid shipping the containerd runtime in the image.

# As a safety measure, if any containerd-related directories exist in the
# build context or base image, set restrictive permissions (0700) so they do
# not trigger overly-broad permission findings. This is intentionally
# defensive — prefer removing the runtime packages entirely.
RUN if [ -d /var/lib/containerd ]; then chmod 700 /var/lib/containerd || true; fi && \
    if [ -d /run/containerd/io.containerd.grpc.v1.cri ]; then chmod 700 /run/containerd/io.containerd.grpc.v1.cri || true; fi && \
    if [ -d /run/containerd/io.containerd.sandbox.controller.v1.shim ]; then chmod 700 /run/containerd/io.containerd.sandbox.controller.v1.shim || true; fi

# Copy application files from builder stage
COPY --from=builder /app /app

# Ensure proper ownership of application files
RUN chown -R mcp:mcp /app

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Add OCI labels for attestation metadata
LABEL org.opencontainers.image.title="Proxmox MCP Server"
LABEL org.opencontainers.image.description="Docker container for Proxmox MCP Server using official MCP SDK"
LABEL org.opencontainers.image.authors="PureGrain at SLA Ops, LLC"
LABEL org.opencontainers.image.source="https://github.com/PureGrain/ProxmoxEmCP"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.revision="git-commit-sha"
LABEL org.opencontainers.image.created="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

# Switch to non-root user
USER mcp

# Run the application (fixing the typo - should be mcp_server_stdio.py)
CMD ["python3", "mcp_server_stdio.py"]
