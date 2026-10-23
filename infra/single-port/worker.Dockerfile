# Live background worker image: the API image with the worker as its command (see api.Dockerfile).
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY apps/api/ .
ENV PATH="/app/.venv/bin:$PATH"
RUN useradd --create-home app
# The example is listed so the copy works when there's no .env; only the real .env is kept.
COPY infra/single-port/live.env /app/settings/defaults.env
COPY .env.production.example .env* /app/settings/
RUN cd /app/settings && find . -name '.env?*' -delete \
    && chown -R root:app /app/settings && chmod 750 /app/settings && chmod 640 /app/settings/*
USER app
CMD ["arq", "app.workers.main.WorkerSettings"]
