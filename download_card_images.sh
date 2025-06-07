#!/bin/bash
# download_card_images.sh
# Downloads all card images referenced in cards.json to images/cards/

set -e

JSON_URL="https://raw.githubusercontent.com/flibustier/pokemon-tcg-pocket-database/main/dist/cards.json"
IMG_BASE="https://raw.githubusercontent.com/flibustier/pokemon-tcg-exchange/main/public/images/cards"
IMG_DIR="images/cards"

mkdir -p "$IMG_DIR"

# Download the latest cards.json
echo "Downloading cards.json..."
curl -sSL "$JSON_URL" -o cards.json

echo "Extracting image names and downloading images..."

jq -r '.[].imageName' cards.json | sort -u | while read -r img; do
  # Only download if image name is not empty and looks like a valid file
  if [[ -n "$img" && "$img" =~ ^[a-zA-Z0-9._-]+\.webp$ && ! -f "$IMG_DIR/$img" ]]; then
    echo "Downloading $img..."
    curl -sSL "$IMG_BASE/$img" -o "$IMG_DIR/$img"
  fi
done

echo "All images downloaded (skipped blanks/invalids)."
