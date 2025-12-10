#!/bin/bash

#
# ADOBE CONFIDENTIAL
# ___________________
# Copyright 2025 Adobe
# All Rights Reserved.
# NOTICE: All information contained herein is, and remains
# the property of Adobe and its suppliers, if any. The intellectual
# and technical concepts contained herein are proprietary to Adobe
# and its suppliers and are protected by all applicable intellectual
# property laws, including trade secret and copyright laws.
# Dissemination of this information or reproduction of this material
# is strictly forbidden unless prior written permission is obtained
# from Adobe.
#

# Sync AEM_COMPUTE_SERVICE from .env to fastly.toml [env] section
# Only updates if missing or different

set -e

# Check if AEM_COMPUTE_SERVICE is set
if [ -z "$AEM_COMPUTE_SERVICE" ]; then
    echo "ERROR: AEM_COMPUTE_SERVICE environment variable is required"
    echo "Add it to your .env file with format: p<project>-e<env>-<service-name>"
    exit 1
fi

# Check current value in fastly.toml
CURRENT_VALUE=$(grep "AEM_COMPUTE_SERVICE" fastly.toml | sed 's/.*= "\(.*\)"/\1/' || echo "")

if [ "$CURRENT_VALUE" = "$AEM_COMPUTE_SERVICE" ]; then
    echo "✓ AEM_COMPUTE_SERVICE already set correctly in fastly.toml: $AEM_COMPUTE_SERVICE"
else
    echo "Updating AEM_COMPUTE_SERVICE in fastly.toml: $AEM_COMPUTE_SERVICE"
    
    # Check if it exists in the file
    if grep -q "AEM_COMPUTE_SERVICE" fastly.toml; then
        # Update existing value
        sed -i.tmp "s|AEM_COMPUTE_SERVICE = \".*\"|AEM_COMPUTE_SERVICE = \"$AEM_COMPUTE_SERVICE\"|" fastly.toml && rm -f fastly.toml.tmp
    else
        # Add after [env] line
        sed -i.tmp "/^\[env\]/a\\
  AEM_COMPUTE_SERVICE = \"$AEM_COMPUTE_SERVICE\"
" fastly.toml && rm -f fastly.toml.tmp
    fi
    
    echo "✓ Updated fastly.toml with AEM_COMPUTE_SERVICE"
fi

