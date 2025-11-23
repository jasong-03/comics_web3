# Quick Start Guide

## Setup

1. Install Sui CLI: https://docs.sui.io/build/install
2. Navigate to the contract directory:
   ```bash
   cd contracts/infinite_heroes
   ```
3. Build the package:
   ```bash
   sui move build
   ```
4. Run tests:
   ```bash
   sui move test
   ```

## Deployment

1. Publish the package:
   ```bash
   sui client publish --gas-budget 100000000
   ```

2. Initialize the protocol (call `protocol::init` after publishing)

## Common Workflows

### Creating a HeroAsset

```move
// 1. Create the hero
let hero = hero_asset::create(
    name,
    source_blob_id,
    metadata_url,
    ctx
);

// 2. Place in kiosk (optional - can keep as owned object)
hero_asset::place_in_kiosk(
    hero,
    &mut kiosk,
    &kiosk_cap,
    ctx
);
```

### Setting Rental Price

```move
// Note: Hero must be unlocked from kiosk first if it's locked
// 1. Take hero out of kiosk (if locked)
let hero = kiosk::take(kiosk, kiosk_cap, hero_id, transfer_policy);

// 2. Update rental price
hero_asset::enable_rental(&mut hero, rental_price);

// 3. Place back in kiosk
hero_asset::place_in_kiosk(hero, &mut kiosk, &kiosk_cap, ctx);
```

### Creating a Comic Series

```move
let series = comic_series::create(
    title,
    genre,  // e.g., "Cyberpunk Noir", "High Fantasy", "Space Opera"
    ctx
);
```

### Minting a Comic Issue

```move
// Using a rented hero
protocol::mint_issue(
    &mut protocol_state,
    &mut series,
    &hero,  // Hero must be accessible (not locked, or shared)
    title,
    cover_url,
    walrus_blob_id,
    mode,  // "action" or "novel"
    &mut kiosk,
    &kiosk_cap,
    payment,
    ctx
);

// Using your own hero (no rental fee)
protocol::mint_issue_with_own_hero(
    &mut protocol_state,
    &mut series,
    &hero,
    title,
    cover_url,
    walrus_blob_id,
    mode,
    &mut kiosk,
    &kiosk_cap,
    payment,
    ctx
);
```

### Tracking Reads and Votes

```move
// Increment read count
comic_issue::increment_read_count(&mut issue);

// Cast a vote (1-5 scale)
comic_issue::cast_vote(&mut issue, 5, ctx);

// Add sequel link
comic_issue::add_sequel_link(&mut issue, sequel_issue_id);
```

## Important Notes

1. **Hero Kiosk Strategy**: 
   - Heroes can be placed (not locked) in kiosks for easy access
   - Or kept as owned objects
   - If locked, must unlock before rental price updates

2. **Payment Flow**:
   - Minimum payment: 1 SUI (configurable)
   - Platform fee: 5% (configurable by admin)
   - Hero royalty: 5% of rental price (if rented)

3. **Dynamic Fields**:
   - Read count, sequel links, and votes are stored as dynamic fields
   - These can evolve over time without upgrading the NFT

4. **Transfer Policies**:
   - All assets use TransferPolicy for royalty enforcement
   - Policies are frozen after creation to prevent changes

