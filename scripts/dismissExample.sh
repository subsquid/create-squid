#!/bin/sh

PWD="`pwd`"
if [ -d "$1" ]; then
	cd "$1"
	rm -r db src/model src/abi node_modules package-lock.json
  sqd down
	cd "$PWD"
else
	echo "\"$1\" is not a directory"
fi