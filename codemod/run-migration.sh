#!/bin/bash

# React Query v0.2 Migration Script
# This script helps run the jscodeshift codemod with the correct settings

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
DRY_RUN=true
TARGET_PATH="src/"
EXTENSIONS="ts,tsx"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --apply)
      DRY_RUN=false
      shift
      ;;
    --path)
      TARGET_PATH="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --apply       Apply the transformation (default is dry-run)"
      echo "  --path PATH   Target path to transform (default: src/)"
      echo "  --help        Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                    # Dry run on src/ directory"
      echo "  $0 --apply            # Apply transformation to src/"
      echo "  $0 --path lib/       # Dry run on lib/ directory"
      echo "  $0 --apply --path components/  # Apply to components/"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Check if jscodeshift is available
if ! command -v jscodeshift &> /dev/null && ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: jscodeshift is not installed and npx is not available${NC}"
    echo "Please install jscodeshift globally: npm install -g jscodeshift"
    echo "Or ensure npx is available"
    exit 1
fi

# Use jscodeshift if available, otherwise use npx
JSCODESHIFT_CMD="jscodeshift"
if ! command -v jscodeshift &> /dev/null; then
    JSCODESHIFT_CMD="npx jscodeshift"
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TRANSFORM_PATH="$SCRIPT_DIR/react-query-v0.2-migration.js"

# Check if transform file exists
if [ ! -f "$TRANSFORM_PATH" ]; then
    echo -e "${RED}Error: Transform file not found at $TRANSFORM_PATH${NC}"
    exit 1
fi

# Check if target path exists
if [ ! -e "$TARGET_PATH" ]; then
    echo -e "${RED}Error: Target path does not exist: $TARGET_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}React Query v0.2 Migration Codemod${NC}"
echo "====================================="
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Running in DRY RUN mode${NC}"
    echo "No files will be modified. Use --apply to apply changes."
else
    echo -e "${RED}Running in APPLY mode${NC}"
    echo "Files will be modified. Make sure you have committed your changes!"
    echo ""
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
fi

echo ""
echo "Target path: $TARGET_PATH"
echo "Extensions: $EXTENSIONS"
echo "Transform: $TRANSFORM_PATH"
echo ""

# Build the command
CMD="$JSCODESHIFT_CMD -t $TRANSFORM_PATH $TARGET_PATH --extensions=$EXTENSIONS --parser=tsx"

if [ "$DRY_RUN" = true ]; then
    CMD="$CMD --dry"
fi

# Show the command
echo "Running command:"
echo "  $CMD"
echo ""

# Execute the transformation
$CMD

# Check the exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Codemod completed successfully${NC}"
    
    if [ "$DRY_RUN" = true ]; then
        echo ""
        echo "This was a dry run. To apply the changes, run:"
        echo "  $0 --apply"
    else
        echo ""
        echo "Changes have been applied. Next steps:"
        echo "1. Review the changes: git diff"
        echo "2. Run your build: npm run build"
        echo "3. Run your tests: npm test"
        echo "4. Test your application"
    fi
else
    echo ""
    echo -e "${RED}✗ Codemod failed${NC}"
    echo "Please check the errors above and try again."
    exit 1
fi