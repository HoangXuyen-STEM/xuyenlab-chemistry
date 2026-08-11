FROM debian:bookworm-slim@sha256:abd67ffcfa541b485a3dff59865ab629aa048a6c613e639d36e7456b0b229241

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
        libreoffice-writer \
        python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY scripts/import-docx/prototype.py /usr/local/bin/xuyenlab-import-prototype
RUN chmod 0755 /usr/local/bin/xuyenlab-import-prototype

ENTRYPOINT ["python3", "/usr/local/bin/xuyenlab-import-prototype"]
