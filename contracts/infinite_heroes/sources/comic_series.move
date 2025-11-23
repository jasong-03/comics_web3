module infinite_heroes::comic_series;

use sui::object;
use sui::dynamic_field;
use sui::event;
use sui::tx_context;
use std::string::{Self, String};

// === Errors ===


const EInvalidTitle: u64 = 1;

// === Constants ===

const MAX_TITLE_LENGTH: u64 = 100;
const MIN_TITLE_LENGTH: u64 = 1;

// === Structs ===

/// Dynamic field key for tracking issue numbers
public struct IssueKey(u64) has copy, drop, store;

/// ComicSeries represents a collection of comic issues
/// Acts as a parent container linking all issues in a series
public struct ComicSeries has key, store {
    id: UID,
    // Title of the comic series
    title: String,
    // Creator address
    creator: address,
    // Current issue count (starts at 0)
    issue_count: u64,
    // Genre of the series (e.g., "Cyberpunk Noir", "High Fantasy", "Space Opera")
    genre: String,
    // Creation timestamp
    created_at: u64,
}

// === Events ===

/// Emitted when a new ComicSeries is created
public struct ComicSeriesCreatedEvent has copy, drop {
    series_id: ID,
    title: String,
    creator: address,
    genre: String,
}

/// Emitted when a new issue is added to the series
public struct IssueAddedEvent has copy, drop {
    series_id: ID,
    issue_number: u64,
    issue_id: ID,
}

// === Public Functions ===

/// Creates a new ComicSeries
public fun create(
    title: String,
    genre: String,
    ctx: &mut TxContext
): ComicSeries {
    let title_length = string::length(&title);
    assert!(title_length >= MIN_TITLE_LENGTH, EInvalidTitle);
    assert!(title_length <= MAX_TITLE_LENGTH, EInvalidTitle);
    
    let creator = tx_context::sender(ctx);
    let created_at = tx_context::epoch_timestamp_ms(ctx);
    
    let series = ComicSeries {
        id: object::new(ctx),
        title,
        creator,
        issue_count: 0,
        genre,
        created_at,
    };
    
    let series_id = object::id(&series);
    
    event::emit(ComicSeriesCreatedEvent {
        series_id,
        title,
        creator,
        genre,
    });
    
    series
}

/// Increments the issue count and returns the new issue number
/// This should be called when minting a new issue
public fun increment_issue_count(series: &mut ComicSeries): u64 {
    series.issue_count = series.issue_count + 1;
    series.issue_count
}

/// Links an issue to the series using dynamic fields
public fun link_issue(
    series: &mut ComicSeries,
    issue_number: u64,
    issue_id: ID
) {
    let key = IssueKey(issue_number);
    dynamic_field::add(&mut series.id, key, issue_id);
    
    event::emit(IssueAddedEvent {
        series_id: object::id(series),
        issue_number,
        issue_id,
    });
}

// === View Functions ===

/// Returns the series title
public fun title(series: &ComicSeries): String {
    series.title
}

/// Returns the creator address
public fun creator(series: &ComicSeries): address {
    series.creator
}

/// Returns the current issue count
public fun issue_count(series: &ComicSeries): u64 {
    series.issue_count
}

/// Returns the genre
public fun genre(series: &ComicSeries): String {
    series.genre
}

/// Returns the creation timestamp
public fun created_at(series: &ComicSeries): u64 {
    series.created_at
}

/// Checks if an issue number exists in the series
public fun issue_exists(series: &ComicSeries, issue_number: u64): bool {
    let key = IssueKey(issue_number);
    dynamic_field::exists_(&series.id, key)
}

/// Returns the issue ID for a given issue number
public fun issue_id(series: &ComicSeries, issue_number: u64): ID {
    let key = IssueKey(issue_number);
    *dynamic_field::borrow(&series.id, key)
}

