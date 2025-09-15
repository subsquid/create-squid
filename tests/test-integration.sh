#!/bin/sh

# Tests that the generator produces expected output for example indexers

set -euo pipefail

PROJECT_ROOT=`pwd`
TESTS_DIR="$PROJECT_ROOT/tests"
DIST_DIR="$PROJECT_ROOT/dist"

# Function to run a test for a specific example
run_test() {
	local example_dir="$1"
	local example_name=$(basename "$example_dir")

	# Create temporary directory
	local temp_dir=$(mktemp -d)

	# Copy createSquid.yaml and abi folder to temp directory
	if [ ! -f "$example_dir/createSquid.yaml" ]; then
		echo "Error: createSquid.yaml not found in $example_dir"
		rm -rf "$temp_dir"
		return 1
	fi

	if [ ! -d "$example_dir/abi" ]; then
		echo "Error: abi directory not found in $example_dir"
		rm -rf "$temp_dir"
		return 1
	fi

	cp "$example_dir/createSquid.yaml" "$temp_dir/"
	cp -r "$example_dir/abi" "$temp_dir/"

	# Run the generator
	cd "$temp_dir"
	if ! node "$DIST_DIR/cli.js" --skip-install --skip-external-codegens >/dev/null 2>&1; then
		echo "Error: Generator failed for $example_name"
		cd "$PROJECT_ROOT"
		rm -rf "$temp_dir"
		return 1
	fi

	cd "$PROJECT_ROOT"

	# Compare generated output with expected output using diff -r
	if ! diff -r "$example_dir" "$temp_dir" ; then
		echo "Error: Generated output differs from expected for $example_name"
		rm -rf "$temp_dir"
		return 1
	fi

	rm -rf "$temp_dir"
	return 0
}

# Run tests for each example
for example_dir in "${TESTS_DIR}"/*; do
	if [ -d "$example_dir" ]; then
		if ! run_test "$example_dir"; then
			exit 1
		fi
	fi
done
