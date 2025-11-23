module infinite_heroes::protocol;

use sui::object;
use sui::url::{Self, Url};
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::transfer_policy::{Self, TransferPolicy};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};
use sui::table::{Self, Table};
use sui::event;
use sui::tx_context;
use sui::transfer;
use std::string::String;
use std::option::{Self, Option};
use infinite_heroes::hero_asset::{Self, HeroAsset};
use infinite_heroes::comic_series::{Self, ComicSeries};
use infinite_heroes::comic_issue::{Self, ComicIssue};
use infinite_heroes::admin::AdminCap;

// === Imports ===

// === Errors ===

const EInsufficientPayment: u64 = 0;
const ERentalNotEnabled: u64 = 1;
const EInvalidHero: u64 = 2;
const ENotAuthorized: u64 = 3;
const EInvalidSeries: u64 = 4;

// === Constants ===

const PLATFORM_FEE_BASIS_POINTS: u64 = 500; // 5% platform fee
const HERO_ROYALTY_BASIS_POINTS: u64 = 500; // 5% hero owner royalty
const BASIS_POINTS_DENOMINATOR: u64 = 10000;

// === Structs ===

/// Protocol state for managing fees and treasury
public struct ProtocolState has key {
    id: UID,
    // Treasury balance for platform fees
    treasury: Balance<SUI>,
    // Admin capability
    admin: address,
    // Minimum minting price
    min_mint_price: u64,
    // Platform fee in basis points (default 5%)
    platform_fee_bps: u64,
    // Hero royalty in basis points (default 5%)
    hero_royalty_bps: u64,
}

// === Events ===

/// Emitted when a ComicIssue is minted
public struct IssueMintedEvent has copy, drop {
    issue_id: ID,
    series_id: ID,
    issue_number: u64,
    creator: address,
    hero_origin_id: Option<ID>,
    total_payment: u64,
    platform_fee: u64,
    hero_royalty: u64,
}

/// Emitted when protocol fees are updated
public struct FeeUpdatedEvent has copy, drop {
    platform_fee_bps: u64,
    hero_royalty_bps: u64,
}

// === Package Functions ===

/// Initializes the protocol state
/// This should be called once during package publishing
fun init(ctx: &mut TxContext) {
    let admin = tx_context::sender(ctx);
    
    let state = ProtocolState {
        id: object::new(ctx),
        treasury: balance::zero(),
        admin,
        min_mint_price: 1000000000, // 1 SUI in MIST
        platform_fee_bps: PLATFORM_FEE_BASIS_POINTS,
        hero_royalty_bps: HERO_ROYALTY_BASIS_POINTS,
    };
    
    transfer::share_object(state);
}

// === Public Functions ===

/// Mints a new ComicIssue NFT
/// Handles payment splitting between platform and hero owner (if rented)
/// Places the issue directly into the user's kiosk
public fun mint_issue(
    state: &mut ProtocolState,
    series: &mut ComicSeries,
    hero: &HeroAsset,
    title: String,
    cover_url: Url,
    walrus_blob_id: u256,
    mode: String,
    kiosk: &mut Kiosk,
    kiosk_cap: &KioskOwnerCap,
    policy: &TransferPolicy<ComicIssue>,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    let mut payment = payment;
    let payment_amount = coin::value(&payment);
    assert!(payment_amount >= state.min_mint_price, EInsufficientPayment);
    
    let creator = tx_context::sender(ctx);
    
    // Check if hero rental is enabled and calculate fees
    let hero_rental_price = hero_asset::rental_price(hero);
    let hero_royalty = if (option::is_some(&hero_rental_price)) {
        let rental = *option::borrow(&hero_rental_price);
        assert!(payment_amount >= rental, EInsufficientPayment);
        
        // Calculate hero royalty from rental price
        (rental * state.hero_royalty_bps) / BASIS_POINTS_DENOMINATOR
    } else {
        0
    };
    
    // Calculate platform fee
    let platform_fee = (payment_amount * state.platform_fee_bps) / BASIS_POINTS_DENOMINATOR;
    
    // Split payment
    let hero_owner = hero_asset::owner(hero);
    let hero_origin_id = if (option::is_some(&hero_rental_price)) {
        option::some(object::id(hero))
    } else {
        option::none()
    };
    
    // Take platform fee
    let platform_coin = coin::split(&mut payment, platform_fee, ctx);
    balance::join(&mut state.treasury, coin::into_balance(platform_coin));
    
    // Send hero royalty if applicable
    if (hero_royalty > 0) {
        let hero_coin = coin::split(&mut payment, hero_royalty, ctx);
        transfer::public_transfer(hero_coin, hero_owner);
    };
    
    // Return remaining payment to creator
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, creator);
    } else {
        coin::destroy_zero(payment);
    };
    
    // Increment series issue count
    let issue_number = comic_series::increment_issue_count(series);
    
    // Create the ComicIssue
    let issue = comic_issue::create(
        object::id(series),
        issue_number,
        title,
        cover_url,
        walrus_blob_id,
        hero_origin_id,
        mode,
        ctx
    );
    
    let issue_id = object::id(&issue);
    
    // Link issue to series
    comic_series::link_issue(series, issue_number, issue_id);
    
    // Place issue into kiosk and lock it
    kiosk::lock(kiosk, kiosk_cap, policy, issue);
    
    event::emit(IssueMintedEvent {
        issue_id,
        series_id: object::id(series),
        issue_number,
        creator,
        hero_origin_id,
        total_payment: payment_amount,
        platform_fee,
        hero_royalty,
    });
}

/// Mints a ComicIssue using the creator's own HeroAsset (no rental fee)
public fun mint_issue_with_own_hero(
    state: &mut ProtocolState,
    series: &mut ComicSeries,
    hero: &HeroAsset,
    title: String,
    cover_url: Url,
    walrus_blob_id: u256,
    mode: String,
    kiosk: &mut Kiosk,
    kiosk_cap: &KioskOwnerCap,
    policy: &TransferPolicy<ComicIssue>,
    payment: Coin<SUI>,
    ctx: &mut TxContext
) {
    let mut payment = payment;
    let creator = tx_context::sender(ctx);
    let hero_owner = hero_asset::owner(hero);
    
    // Verify the creator owns the hero
    assert!(creator == hero_owner, ENotAuthorized);
    
    let payment_amount = coin::value(&payment);
    assert!(payment_amount >= state.min_mint_price, EInsufficientPayment);
    
    // Calculate platform fee only (no hero royalty for own hero)
    let platform_fee = (payment_amount * state.platform_fee_bps) / BASIS_POINTS_DENOMINATOR;
    
    // Take platform fee
    let platform_coin = coin::split(&mut payment, platform_fee, ctx);
    balance::join(&mut state.treasury, coin::into_balance(platform_coin));
    
    // Return remaining payment to creator
    if (coin::value(&payment) > 0) {
        transfer::public_transfer(payment, creator);
    } else {
        coin::destroy_zero(payment);
    };
    
    // Increment series issue count
    let issue_number = comic_series::increment_issue_count(series);
    
    // Create the ComicIssue with hero origin ID
    let hero_origin_id = option::some(object::id(hero));
    let issue = comic_issue::create(
        object::id(series),
        issue_number,
        title,
        cover_url,
        walrus_blob_id,
        hero_origin_id,
        mode,
        ctx
    );
    
    let issue_id = object::id(&issue);
    
    // Link issue to series
    comic_series::link_issue(series, issue_number, issue_id);
    
    // Place issue into kiosk and lock it
    kiosk::lock(kiosk, kiosk_cap, policy, issue);
    
    event::emit(IssueMintedEvent {
        issue_id,
        series_id: object::id(series),
        issue_number,
        creator,
        hero_origin_id,
        total_payment: payment_amount,
        platform_fee,
        hero_royalty: 0,
    });
}

// === Admin Functions ===

/// Updates the platform fee (in basis points)
public fun admin_set_platform_fee(
    state: &mut ProtocolState,
    _: &AdminCap,
    new_fee_bps: u64
) {
    assert!(new_fee_bps <= 1000, 0); // Max 10%
    state.platform_fee_bps = new_fee_bps;
    
    event::emit(FeeUpdatedEvent {
        platform_fee_bps: new_fee_bps,
        hero_royalty_bps: state.hero_royalty_bps,
    });
}

/// Updates the hero royalty (in basis points)
public fun admin_set_hero_royalty(
    state: &mut ProtocolState,
    _: &AdminCap,
    new_royalty_bps: u64
) {
    assert!(new_royalty_bps <= 1000, 0); // Max 10%
    state.hero_royalty_bps = new_royalty_bps;
    
    event::emit(FeeUpdatedEvent {
        platform_fee_bps: state.platform_fee_bps,
        hero_royalty_bps: new_royalty_bps,
    });
}

/// Updates the minimum minting price
public fun admin_set_min_mint_price(
    state: &mut ProtocolState,
    _: &AdminCap,
    new_min_price: u64
) {
    state.min_mint_price = new_min_price;
}

/// Withdraws funds from the treasury (admin only)
public fun admin_withdraw(
    state: &mut ProtocolState,
    _: &AdminCap,
    amount: u64,
    ctx: &mut TxContext
): Coin<SUI> {
    coin::take(&mut state.treasury, amount, ctx)
}

// === View Functions ===

/// Returns the platform fee in basis points
public fun platform_fee_bps(state: &ProtocolState): u64 {
    state.platform_fee_bps
}

/// Returns the hero royalty in basis points
public fun hero_royalty_bps(state: &ProtocolState): u64 {
    state.hero_royalty_bps
}

/// Returns the minimum minting price
public fun min_mint_price(state: &ProtocolState): u64 {
    state.min_mint_price
}

/// Returns the treasury balance
public fun treasury_balance(state: &ProtocolState): u64 {
    balance::value(&state.treasury)
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

