FROM node:24-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /pipeline

COPY checksums.sha256 download.sh parse-wordnet.mjs ./
RUN chmod +x download.sh

# Run as the image's built-in uid-1000 user so files written to the volume
# mounts below are owned by the host user, not root.
USER node

# sources/ (snapshots, ~500 MB) and build/ (outputs) are volume mounts so
# downloads are cached across runs and outputs land on the host.
CMD ["bash", "-c", "./download.sh && node parse-wordnet.mjs"]
