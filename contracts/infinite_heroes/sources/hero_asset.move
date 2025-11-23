module infinite_heroes::hero_asset;

use sui::object::{Self, UID, ID};
use sui::url::{Self, Url};
use sui::transfer_policy::{Self, TransferPolicy};
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::package;

use sui::event;
use sui::tx_context::{Self, TxContext};
use std::string::String;
use std::option::{Self, Option};

// === Errors ===

const ENotAuthorized: u64 = 0;
const EInvalidRentalPrice: u64 = 1;
const ERentalNotEnabled: u64 = 2;
const EAlreadyInKiosk: u64 = 3;

// === OTW ===

public struct HERO_ASSET has drop {}

// === Constants ===

const MIN_RENTAL_PRICE: u64 = 1000; // Minimum rental price in MIST

// === Structs ===

/// HeroAsset NFT representing a user's tokenized identity
/// Created from a user selfie/avatar and stored on Walrus
public struct HeroAsset has key, store {
    id: UID,
    // Name of the hero character
    name: String,
    // Walrus blob ID for the high-resolution source image
    source_blob_id: u256,
    // Optional rental price per issue (in MIST)
    // If None, the hero cannot be rented
    rental_price_per_issue: Option<u64>,
    // Owner address for royalty tracking
    owner: address,
    // Metadata URL for additional hero information
    metadata_url: Url,
}

// === Events ===

/// Emitted when a HeroAsset is created
public struct HeroAssetCreatedEvent has copy, drop {
    hero_id: ID,
    owner: address,
    name: String,
}

/// Emitted when rental price is updated
public struct RentalPriceUpdatedEvent has copy, drop {
    hero_id: ID,
    old_price: Option<u64>,
    new_price: Option<u64>,
}

// === Public Functions ===

fun init(otw: HERO_ASSET, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let (policy, policy_cap) = transfer_policy::new<HeroAsset>(&publisher, ctx);
    
    transfer::public_share_object(policy);
    transfer::public_transfer(policy_cap, tx_context::sender(ctx));
    transfer::public_transfer(publisher, tx_context::sender(ctx));
}

/// Creates a new HeroAsset NFT
/// Returns the hero object to be placed in kiosk by the caller
public fun create(
    name: String,
    source_blob_id: u256,
    metadata_url: Url,
    ctx: &mut TxContext
): HeroAsset {
    use sui::tx_context;
    
    let owner = tx_context::sender(ctx);
    
    let hero = HeroAsset {
        id: object::new(ctx),
        name,
        source_blob_id,
        rental_price_per_issue: option::none(),
        owner,
        metadata_url,
    };

    let hero_id = object::id(&hero);
    
    event::emit(HeroAssetCreatedEvent {
        hero_id,
        owner,
        name,
    });
    
    hero
}

/// Places a HeroAsset into kiosk with transfer policy
/// This should be called after creating the hero
public fun place_in_kiosk(
    hero: HeroAsset,
    kiosk: &mut Kiosk,
    kiosk_cap: &KioskOwnerCap,
    policy: &TransferPolicy<HeroAsset>,
    _ctx: &mut TxContext
) {
    // Place hero into kiosk and lock it
    kiosk::lock(kiosk, kiosk_cap, policy, hero);
}

/// Enables rental for a HeroAsset with a specified price
/// Only the owner can set rental price
/// Note: Hero must be taken out of kiosk (unlocked) before calling this function
public fun enable_rental(
    hero: &mut HeroAsset,
    rental_price: u64
) {
    assert!(rental_price >= MIN_RENTAL_PRICE, EInvalidRentalPrice);
    
    let old_price = hero.rental_price_per_issue;
    hero.rental_price_per_issue = option::some(rental_price);
    
    event::emit(RentalPriceUpdatedEvent {
        hero_id: object::id(hero),
        old_price,
        new_price: option::some(rental_price),
    });
}

/// Disables rental for a HeroAsset
/// Note: Hero must be taken out of kiosk (unlocked) before calling this function
public fun disable_rental(hero: &mut HeroAsset) {
    let old_price = hero.rental_price_per_issue;
    hero.rental_price_per_issue = option::none();
    
    event::emit(RentalPriceUpdatedEvent {
        hero_id: object::id(hero),
        old_price,
        new_price: option::none(),
    });
}

/// Updates the rental price for a HeroAsset
/// Note: Hero must be taken out of kiosk (unlocked) before calling this function
public fun update_rental_price(
    hero: &mut HeroAsset,
    new_price: u64
) {
    assert!(new_price >= MIN_RENTAL_PRICE, EInvalidRentalPrice);
    
    let old_price = hero.rental_price_per_issue;
    hero.rental_price_per_issue = option::some(new_price);
    
    event::emit(RentalPriceUpdatedEvent {
        hero_id: object::id(hero),
        old_price,
        new_price: option::some(new_price),
    });
}

// === View Functions ===

/// Returns the rental price if rental is enabled
public fun rental_price(hero: &HeroAsset): Option<u64> {
    hero.rental_price_per_issue
}

/// Checks if rental is enabled for this hero
public fun is_rental_enabled(hero: &HeroAsset): bool {
    option::is_some(&hero.rental_price_per_issue)
}

/// Returns the owner address
public fun owner(hero: &HeroAsset): address {
    hero.owner
}

/// Returns the source blob ID
public fun source_blob_id(hero: &HeroAsset): u256 {
    hero.source_blob_id
}

/// Returns the hero name
public fun name(hero: &HeroAsset): String {
    hero.name
}

/// Returns the metadata URL
public fun metadata_url(hero: &HeroAsset): Url {
    hero.metadata_url
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(HERO_ASSET {}, ctx);
}

