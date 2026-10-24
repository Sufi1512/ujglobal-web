# Live API image, built from the repository root (compose.yml). Same as apps/api/Dockerfile, plus the
# site's settings: the .env your hosting panel puts next to compose.yml is copied in, so the API works
# even when the panel doesn't pass environment variables to containers. The image is built on your
# server and never pushed anywhere; real environment variables still override the file.
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
    && chown -R root:app /app/settings && chmod -R u=rwX,g=rX,o= /app/settings
# chmod -R, not /app/settings/*: the shell's * skips dotfiles, so .env would keep the owner-only mode
# panels often save it with, and the app user couldn't read it.
USER app
EXPOSE 9007
CMD ["sh", "-c", "python -m app.db_bootstrap && alembic upgrade head && exec gunicorn app.main:app -k uvicorn.workers.UvicornWorker -w 2 -b 127.0.0.1:9007"]
