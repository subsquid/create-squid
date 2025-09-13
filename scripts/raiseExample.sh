#!/bin/sh

PWD="`pwd`"
if [ -d "$1" ]; then
	cd "$1"
	npm i
	sqd typegen
	sqd codegen
	sqd up
	sqd migration:generate
	sqd down
	cd "$PWD"
else
	echo "\"$1\" is not a directory"
fi