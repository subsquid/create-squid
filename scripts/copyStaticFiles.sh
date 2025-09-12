#!/bin/sh

set -euo pipefail
IFS=$'\n'

if [[ "$1" == "-h" || "$1" == "--help" || ! -d "$1" || ! -d "$2" || ( "$3" != "" && "$3" != "--mustache" ) ]]; then
	echo "Usage: copyStaticFiles.sh <inDir> <outDir> [--mustache]"
	echo "The last option adds a .mustache extension to every file's name"
fi

IN_DIR="$1"
OUT_DIR="$2"

EXTRA_EXTENSION=""
if [[ "$3" == "--mustache" ]]; then
	EXTRA_EXTENSION=".mustache"
fi

for dir in abi assets .github/workflows; do
	echo mkdir -p "${OUT_DIR}/${dir}"
	mkdir -p "${OUT_DIR}/${dir}"
done

for file in abi/README.md assets/README.md docker-compose.yaml .dockerignore .gitignore jest.config.js tsconfig.json; do
	infile="${IN_DIR}/${file}"
	if [ -e "$infile" ]; then
		echo cp "$infile" "${OUT_DIR}/${file}${EXTRA_EXTENSION}"
		cp "$infile" "${OUT_DIR}/${file}${EXTRA_EXTENSION}"
	fi
done
