# Infinite Heroes - Comic Publishing Protocol

A decentralized comic publishing protocol built on Sui that enables users to create AI-generated comic books using tokenized hero identities.

## Overview

Infinite Heroes is a smart contract suite that solves the "Prosumer Paradox" in Web3 by enabling users to:
- Tokenize their identity as HeroAsset NFTs
- Create comic series and issues using AI-generated content
- Rent or use hero assets with automatic royalty distribution
- Track read counts, sequel links, and community votes via dynamic fields

## Package Structure

```
sources/
├── hero_asset.move      # HeroAsset NFT module for identity tokenization
├── comic_series.move    # ComicSeries parent container module
├── comic_issue.move     # ComicIssue dNFT module with dynamic fields
├── protocol.move        # Main protocol logic with payment splitting
└── admin.move           # Admin capability module
```

## Modules

### hero_asset

Manages HeroAsset NFTs - tokenized identities created from user selfies/avatars.

**Key Features:**
- Mint HeroAsset NFTs with Walrus blob ID storage
- Enable/disable rental functionality
- Set rental prices for hero usage
- Automatic royalty enforcement via TransferPolicy

**Main Functions:**
- `create()` - Creates a new HeroAsset and places it in user's kiosk
- `enable_rental()` - Enables rental with a specified price
- `disable_rental()` - Disables rental functionality
- `update_rental_price()` - Updates the rental price

### comic_series

Manages comic series - parent containers that link all issues in a series.

**Key Features:**
- Create comic series with genre classification
- Track issue count
- Link issues to series using dynamic fields

**Main Functions:**
- `create()` - Creates a new ComicSeries
- `increment_issue_count()` - Increments and returns new issue number
- `link_issue()` - Links an issue to the series

### comic_issue

Manages ComicIssue dNFTs - individual comic issues with evolving metadata.

**Key Features:**
- Dynamic fields for read_count, sequel_links, and community_votes
- Walrus blob ID for high-res content storage
- Hero origin tracking for royalty distribution
- Mode tracking (Action Mode vs Novel Mode)

**Main Functions:**
- `create()` - Creates a new ComicIssue
- `increment_read_count()` - Increments read count
- `add_sequel_link()` - Links to a sequel issue
- `cast_vote()` - Casts a community vote (1-5 scale)

### protocol

Main protocol module handling minting, payment splitting, and kiosk integration.

**Key Features:**
- Payment splitting between platform and hero owners
- Automatic royalty enforcement
- Kiosk integration with TransferPolicy
- Admin functions for fee management

**Main Functions:**
- `mint_issue()` - Mints a ComicIssue with rented hero (pays hero owner)
- `mint_issue_with_own_hero()` - Mints a ComicIssue with creator's own hero
- `admin_set_platform_fee()` - Updates platform fee (admin only)
- `admin_set_hero_royalty()` - Updates hero royalty (admin only)

### admin

Admin capability module for protocol administration.

**Key Features:**
- AdminCap struct for access control
- Secure admin function gating

## Usage Flow

### 1. Create a HeroAsset

```move
hero_asset::create(
    name,
    source_blob_id,  // Walrus blob ID
    metadata_url,
    &mut kiosk,
    &kiosk_cap,
    ctx
);
```

### 2. Enable Rental (Optional)

```move
hero_asset::enable_rental(
    &mut hero,
    &mut kiosk,
    &kiosk_cap,
    rental_price,  // in MIST
    ctx
);
```

### 3. Create a ComicSeries

```move
let series = comic_series::create(
    title,
    genre,  // e.g., "Cyberpunk Noir", "High Fantasy"
    ctx
);
```

### 4. Mint a ComicIssue

```move
protocol::mint_issue(
    &mut protocol_state,
    &mut series,
    &hero,
    title,
    cover_url,
    walrus_blob_id,
    mode,  // "action" or "novel"
    &mut kiosk,
    &kiosk_cap,
    payment,
    ctx
);
```

## Fee Structure

- **Platform Fee**: 5% (500 basis points) - configurable by admin
- **Hero Royalty**: 5% (500 basis points) - configurable by admin
- **Minimum Mint Price**: 1 SUI (configurable by admin)

## Dynamic Fields

ComicIssue uses dynamic fields to track:
- `ReadCountKey()` - Tracks read count
- `SequelLinkKey(ID)` - Links to sequel issues
- `VoteKey(address)` - Stores community votes (1-5 scale)

## Events

All major actions emit events:
- `HeroAssetCreatedEvent` - When a hero is created
- `ComicSeriesCreatedEvent` - When a series is created
- `ComicIssueCreatedEvent` - When an issue is minted
- `IssueMintedEvent` - Detailed minting event with payment info
- `ReadCountUpdatedEvent` - When read count increments
- `VoteCastEvent` - When a vote is cast

## Security Features

- All assets minted into Kiosk with TransferPolicy
- Royalty enforcement via locked transfer policies
- Admin capability pattern for access control
- Payment validation and splitting
- Owner verification for rental management

## Testing

Run tests with:
```bash
sui move test
```

## License

See LICENSE file for details.

