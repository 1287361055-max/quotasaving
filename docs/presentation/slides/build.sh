#!/bin/sh
# ./build.sh -> ../QuotaSaving.pptx and ../QuotaSaving.pdf (the PDF is LibreOffice's render of the same file)
cd "$(dirname "$0")" && mkdir -p preview
uv run -q --with python-pptx --with lxml --with pillow python build.py ../QuotaSaving.pptx || exit 1
FONTCONFIG_FILE=/opt/homebrew/etc/fonts/fonts.conf soffice --headless --convert-to pdf --outdir .. ../QuotaSaving.pptx >/dev/null 2>&1
ls -la ../QuotaSaving.pptx ../QuotaSaving.pdf
