#!/bin/bash

# Check for jq
if ! command -v jq &> /dev/null; then
    echo "jq is required but not installed. Please install it (brew install jq)."
    exit 1
fi

echo "Building and publishing Infinite Heroes contract to Testnet..."

# Publish the package
# Using --skip-dependency-verification to speed up and avoid potential network issues with dependencies if they are already correct
sui client publish --gas-budget 100000000 --json --skip-dependency-verification > deploy_output.json

if [ $? -ne 0 ]; then
    echo "Deployment failed!"
    cat deploy_output.json
    exit 1
fi

echo "Deployment successful! Parsing output from deploy_output.json..."

# Extract Object IDs using jq
PACKAGE_ID=$(jq -r '.objectChanges[] | select(.type == "published") | .packageId' deploy_output.json)
UPGRADE_CAP=$(jq -r '.objectChanges[] | select(type == "object" and has("objectType")) | select(.objectType | contains("::package::UpgradeCap")) | .objectId' deploy_output.json)
PROTOCOL_STATE=$(jq -r '.objectChanges[] | select(type == "object" and has("objectType")) | select(.objectType | contains("::protocol::ProtocolState")) | .objectId' deploy_output.json)
ADMIN_CAP=$(jq -r '.objectChanges[] | select(type == "object" and has("objectType")) | select(.objectType | contains("::admin::AdminCap")) | .objectId' deploy_output.json)

# Extract Transfer Policies
HERO_POLICY=$(jq -r '.objectChanges[] | select(type == "object" and has("objectType")) | select(.objectType | contains("::hero_asset::HeroAsset") and contains("::transfer_policy::TransferPolicy<")) | .objectId' deploy_output.json)
COMIC_POLICY=$(jq -r '.objectChanges[] | select(type == "object" and has("objectType")) | select(.objectType | contains("::comic_issue::ComicIssue") and contains("::transfer_policy::TransferPolicy<")) | .objectId' deploy_output.json)

# Generate Config JSON
cat <<EOF > network_config.json
{
  "network": "testnet",
  "packageId": "$PACKAGE_ID",
  "upgradeCap": "$UPGRADE_CAP",
  "protocolState": "$PROTOCOL_STATE",
  "adminCap": "$ADMIN_CAP",
  "heroPolicy": "$HERO_POLICY",
  "comicPolicy": "$COMIC_POLICY"
}
EOF

echo "--------------------------------------------------"
echo "Package ID: $PACKAGE_ID"
echo "Protocol State: $PROTOCOL_STATE"
echo "Admin Cap: $ADMIN_CAP"
echo "Hero Policy: $HERO_POLICY"
echo "Comic Policy: $COMIC_POLICY"
echo "--------------------------------------------------"
echo "Config saved to network_config.json"
