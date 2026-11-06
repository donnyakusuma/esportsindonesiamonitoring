#!/usr/bin/env bash
# Membangun prototipe web dan menerbitkannya ke GitHub Pages (branch gh-pages).
# Aplikasi berjalan sepenuhnya di browser, jadi cukup di-host sebagai situs statis.
# Pemakaian: npm run deploy:pages
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="$(git -C "$ROOT" remote get-url origin)"
REPO="$(basename "$REMOTE" .git)"
BASE="/${REPO}/"
COMMIT="$(git -C "$ROOT" rev-parse --short HEAD)"

cd "$ROOT"
npx tsc -p web/tsconfig.json
npx vite build --config web/vite.config.ts --base "$BASE"

# Terbitkan isi dist-web sebagai satu commit di branch gh-pages, lewat folder kerja sementara.
KERJA="$(mktemp -d)"
trap 'rm -rf -- "$KERJA"' EXIT
cp -R "$ROOT/dist-web/." "$KERJA/"
touch "$KERJA/.nojekyll"
git -C "$KERJA" init -q -b gh-pages
git -C "$KERJA" add -A
git -C "$KERJA" -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
  commit -q -m "Terbitkan prototipe web dari ${COMMIT}"
git -C "$KERJA" push -q -f "$REMOTE" gh-pages:gh-pages

echo "Terbit: https://$(basename "$(dirname "$REMOTE")").github.io${BASE}"
