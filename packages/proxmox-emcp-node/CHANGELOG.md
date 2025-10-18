# Changelog

## [2.1.0] - 2025-10-17

### Changed

- Switched base image to Alpine (`python:3.14-alpine`) for reduced image size and improved security.

- Replaced `apt-get` commands with `apk` equivalents in the Dockerfile.

- Added `.env` file for environment variable configuration.

- Updated documentation to reflect changes in environment variables and port mapping.

### Fixed

- Addressed Dockerhub Scout health score issues:

  - Resolved unapproved and outdated base images.

  - Improved supply chain security by using a non-root user and adding metadata.
