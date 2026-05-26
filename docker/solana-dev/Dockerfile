# =============================================================================
# Solana + Anchor Development Environment
# Versions:
#   - Solana CLI: 1.18.26
#   - Anchor CLI: 0.32.1
#   - Rust: nightly-2025-09-01 (from project's rust-toolchain.toml)
#   - Node.js: 20.x
# =============================================================================

FROM ubuntu:24.04 AS base

SHELL ["/bin/bash", "-c"]

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV ANCHOR_VERSION=0.32.1
ENV SOLANA_VERSION=1.18.26
ENV PATH="/root/.local/share/solana/install/active_release/bin:/root/.cargo/bin:/root/.avm/bin:${PATH}"

# ---------------------------------------------------------------------------
# System dependencies
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ca-certificates \
    git \
    libssl-dev \
    libudev-dev \
    pkg-config \
    libz-dev \
    protobuf-compiler \
    clang-18 \
    llvm-18 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && ln -s /usr/bin/clang-18 /usr/bin/clang \
    && ln -s /usr/bin/llvm-config-18 /usr/bin/llvm-config

# ---------------------------------------------------------------------------
# Node.js 20.x + yarn
# ---------------------------------------------------------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g yarn \
    && node --version && yarn --version

# ---------------------------------------------------------------------------
# Rust (rustup + nightly toolchain)
# ---------------------------------------------------------------------------
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && rustup install nightly-2025-09-01 \
    && rustup default nightly-2025-09-01 \
    && rustup component add rust-src --toolchain nightly-2025-09-01 \
    && rustc --version

# ---------------------------------------------------------------------------
# Solana CLI
# ---------------------------------------------------------------------------
RUN sh -c "$(curl -sSfL https://release.anza.xyz/v${SOLANA_VERSION}/install)" \
    && solana --version

# ---------------------------------------------------------------------------
# Anchor CLI (via AVM — Anchor Version Manager)
# Compilation takes a while (~20-30 min on first build)
# ---------------------------------------------------------------------------
RUN cargo install --git https://github.com/coral-xyz/anchor avm --locked \
    && avm install ${ANCHOR_VERSION} \
    && avm use ${ANCHOR_VERSION} \
    && anchor --version

# ---------------------------------------------------------------------------
# Configure local Solana keypair and cluster
# ---------------------------------------------------------------------------
RUN solana-keygen new --no-bip39-passphrase --force -o /root/.config/solana/id.json \
    && solana config set --url http://localhost:8899 \
    && solana config set --keypair /root/.config/solana/id.json

WORKDIR /workspace

CMD ["bash"]
