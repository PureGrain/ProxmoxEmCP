# title: Proxmox MCP Server Dockerfile
# author: PureGrain at SLA Ops, LLC
# author_url: https://github.com/PureGrain
# repo_url: https://github.com/PureGrain/ProxmoxMCP
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

# Install runtime dependencies
RUN apk update && apk add --no-cache python3 py3-pip

# Install Docker Scout for CVE scanning
RUN apk add --no-cache docker

# Copy application files from builder stage
COPY --from=builder /app /app

# Generate SARIF file for CVE scanning
RUN docker scout cves --format sarif > /app/docker-scout-cves.sarif

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

# Run the application
CMD ["python3", "mcp_server.py"]
