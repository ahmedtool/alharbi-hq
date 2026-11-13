#!/usr/bin/env bash
# Publishes the built installer as the latest update.
# The app reads latest.yml from the public repo ahmedtool/alharbi-desktop-updates
# and downloads the installer named in it. Run after `npm run dist`.
set -euo pipefail
cd "$(dirname "$0")"
VERSION=$(node -p "require('./package.json').version")
EXE="dist/AhmedAlharbi-Setup-${VERSION}.exe"
[ -f "$EXE" ] && [ -f dist/latest.yml ] || { echo "Build first: npm run dist"; exit 1; }
WORK=$(mktemp -d)
git -C "$WORK" init -q -b main
cp "$EXE" "$EXE.blockmap" dist/latest.yml "$WORK/"
cp "$EXE" "$WORK/AhmedAlharbi-Setup.exe"   # fixed name for first-time downloads
printf '# تطبيق ويندوز: أحمد الحربي\n\nآخر نسخة: %s\n\nللتثبيت لأول مرة: [AhmedAlharbi-Setup.exe](AhmedAlharbi-Setup.exe)\n' "$VERSION" > "$WORK/README.md"
git -C "$WORK" add -A
git -C "$WORK" commit -q -m "Release ${VERSION}"
# One commit only, so old installers don't pile up in the repo.
git -C "$WORK" push -q -f https://github.com/ahmedtool/alharbi-desktop-updates main
echo "Published ${VERSION}"
