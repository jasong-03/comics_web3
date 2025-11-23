module infinite_heroes::comic_issue;

use sui::object;
use sui::url::Url;
use sui::dynamic_field;
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::package;
use sui::transfer_policy::{Self, TransferPolicy};
use sui::event;
use sui::tx_context;
use std::string::String;
use std::option;

// === Errors ===

const EInvalidVote: u64 = 1;

// === OTW ===

public struct COMIC_ISSUE has drop {}

// === Structs ===

/// Dynamic field key for read count
public struct ReadCountKey() has copy, drop, store;

/// Dynamic field key for sequel links (connecting issues)
public struct SequelLinkKey(ID) has copy, drop, store;

/// Dynamic field key for community votes
public struct VoteKey(address) has copy, drop, store;

/// ComicIssue represents a single comic issue NFT (dNFT)
/// Uses dynamic fields to track evolving metadata
public struct ComicIssue has key, store {
    id: UID,
    // Links back to parent ComicSeries
    series_id: ID,
    // Issue number within the series
    issue_number: u64,
    // Title of this specific issue
    title: String,
    // Cover image URL
    cover_url: Url,
    // Walrus blob ID for the full high-res comic content
    walrus_blob_id: u256,
    // Hero origin ID for royalty tracking
    // If this comic uses a rented Hero, this tracks who gets paid
    hero_origin_id: Option<ID>,
    // Creator address
    creator: address,
    // Mode used for generation: "action" or "novel"
    mode: String,
    // Creation timestamp
    created_at: u64,
}

// === Events ===

/// Emitted when a ComicIssue is created
public struct ComicIssueCreatedEvent has copy, drop {
    issue_id: ID,
    series_id: ID,
    issue_number: u64,
    creator: address,
    hero_origin_id: Option<ID>,
}

/// Emitted when read count is incremented
public struct ReadCountUpdatedEvent has copy, drop {
    issue_id: ID,
    new_count: u64,
}

/// Emitted when a sequel link is added
public struct SequelLinkAddedEvent has copy, drop {
    issue_id: ID,
    sequel_issue_id: ID,
}

/// Emitted when a vote is cast
public struct VoteCastEvent has copy, drop {
    issue_id: ID,
    voter: address,
    vote_value: u8,
}

// === Public Functions ===

fun init(otw: COMIC_ISSUE, ctx: &mut TxContext) {
    let publisher = package::claim(otw, ctx);
    let (policy, policy_cap) = transfer_policy::new<ComicIssue>(&publisher, ctx);
    
    transfer::public_share_object(policy);
    transfer::public_transfer(policy_cap, tx_context::sender(ctx));
    transfer::public_transfer(publisher, tx_context::sender(ctx));
}

/// Creates a new ComicIssue
public fun create(
    series_id: ID,
    issue_number: u64,
    title: String,
    cover_url: Url,
    walrus_blob_id: u256,
    hero_origin_id: Option<ID>,
    mode: String,
    ctx: &mut TxContext
): ComicIssue {
    let creator = tx_context::sender(ctx);
    let created_at = tx_context::epoch_timestamp_ms(ctx);
    
    let mut issue = ComicIssue {
        id: object::new(ctx),
        series_id,
        issue_number,
        title,
        cover_url,
        walrus_blob_id,
        hero_origin_id,
        creator,
        mode,
        created_at,
    };
    
    let issue_id = object::id(&issue);
    
    // Initialize read count to 0
    let read_count_key = ReadCountKey();
    dynamic_field::add(&mut issue.id, read_count_key, 0u64);
    
    event::emit(ComicIssueCreatedEvent {
        issue_id,
        series_id,
        issue_number,
        creator,
        hero_origin_id,
    });
    
    issue
}

/// Increments the read count for this issue
public fun increment_read_count(issue: &mut ComicIssue) {
    let key = ReadCountKey();
    let current_count = *dynamic_field::borrow(&issue.id, key);
    let new_count = current_count + 1;
    let _: u64 = dynamic_field::remove(&mut issue.id, key);
    dynamic_field::add(&mut issue.id, key, new_count);
    
    event::emit(ReadCountUpdatedEvent {
        issue_id: object::id(issue),
        new_count,
    });
}

/// Adds a sequel link to another issue
public fun add_sequel_link(
    issue: &mut ComicIssue,
    sequel_issue_id: ID
) {
    let key = SequelLinkKey(sequel_issue_id);
    // Check if link already exists
    if (!dynamic_field::exists_(&issue.id, key)) {
        dynamic_field::add(&mut issue.id, key, true);
        
        event::emit(SequelLinkAddedEvent {
            issue_id: object::id(issue),
            sequel_issue_id,
        });
    };
}

/// Removes a sequel link
public fun remove_sequel_link(
    issue: &mut ComicIssue,
    sequel_issue_id: ID
) {
    let key = SequelLinkKey(sequel_issue_id);
    if (dynamic_field::exists_(&issue.id, key)) {
        let _: bool = dynamic_field::remove(&mut issue.id, key);
    };
}

/// Casts a vote for this issue (1-5 scale)
public fun cast_vote(
    issue: &mut ComicIssue,
    vote_value: u8,
    ctx: &mut TxContext
) {
    assert!(vote_value >= 1 && vote_value <= 5, EInvalidVote);
    
    let voter = tx_context::sender(ctx);
    let key = VoteKey(voter);
    
    // Remove existing vote if any
    if (dynamic_field::exists_(&issue.id, key)) {
        let _: u8 = dynamic_field::remove(&mut issue.id, key);
    };
    
    // Add new vote
    dynamic_field::add(&mut issue.id, key, vote_value);
    
    event::emit(VoteCastEvent {
        issue_id: object::id(issue),
        voter,
        vote_value,
    });
}

// === View Functions ===

/// Returns the series ID
public fun series_id(issue: &ComicIssue): ID {
    issue.series_id
}

/// Returns the issue number
public fun issue_number(issue: &ComicIssue): u64 {
    issue.issue_number
}

/// Returns the title
public fun title(issue: &ComicIssue): String {
    issue.title
}

/// Returns the cover URL
public fun cover_url(issue: &ComicIssue): Url {
    issue.cover_url
}

/// Returns the Walrus blob ID
public fun walrus_blob_id(issue: &ComicIssue): u256 {
    issue.walrus_blob_id
}

/// Returns the hero origin ID if present
public fun hero_origin_id(issue: &ComicIssue): Option<ID> {
    issue.hero_origin_id
}

/// Returns the creator address
public fun creator(issue: &ComicIssue): address {
    issue.creator
}

/// Returns the mode
public fun mode(issue: &ComicIssue): String {
    issue.mode
}

/// Returns the creation timestamp
public fun created_at(issue: &ComicIssue): u64 {
    issue.created_at
}

/// Returns the current read count
public fun read_count(issue: &ComicIssue): u64 {
    let key = ReadCountKey();
    if (dynamic_field::exists_(&issue.id, key)) {
        *dynamic_field::borrow(&issue.id, key)
    } else {
        0
    }
}

/// Checks if a sequel link exists
public fun has_sequel_link(issue: &ComicIssue, sequel_issue_id: ID): bool {
    let key = SequelLinkKey(sequel_issue_id);
    dynamic_field::exists_(&issue.id, key)
}

/// Returns the vote value for a specific voter, or 0 if no vote
public fun vote(issue: &ComicIssue, voter: address): u8 {
    let key = VoteKey(voter);
    if (dynamic_field::exists_(&issue.id, key)) {
        *dynamic_field::borrow(&issue.id, key)
    } else {
        0
    }
}

