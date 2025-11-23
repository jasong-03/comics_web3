#[test_only]
module infinite_heroes::infinite_heroes_tests;

use sui::test_scenario::{Self, Scenario};
use sui::kiosk::{Self, Kiosk, KioskOwnerCap};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::url;
use std::string;
use infinite_heroes::hero_asset::{Self, HeroAsset};
use infinite_heroes::comic_series::{Self, ComicSeries};
use infinite_heroes::comic_issue::{Self, ComicIssue};
use infinite_heroes::protocol::{Self, ProtocolState};
use infinite_heroes::admin::{Self, AdminCap};
use sui::transfer_policy::TransferPolicy;

const ADMIN: address = @0xAD;
const USER: address = @0x1;
const HERO_OWNER: address = @0x2;

#[test]
fun test_hero_asset_creation() {
    let mut scenario = test_scenario::begin(USER);
    let ctx = test_scenario::ctx(&mut scenario);

    // Create kiosk for user and share it immediately
    let (kiosk, kiosk_cap) = kiosk::new(ctx);
    transfer::public_share_object(kiosk);
    transfer::public_transfer(kiosk_cap, USER);

    // Initialize module to create policy
    hero_asset::init_for_testing(ctx);
    
    test_scenario::next_tx(&mut scenario, USER);
    
    let mut kiosk = test_scenario::take_shared<Kiosk>(&scenario);
    let kiosk_cap = test_scenario::take_from_sender<KioskOwnerCap>(&scenario);
    let policy = test_scenario::take_shared<TransferPolicy<HeroAsset>>(&scenario);
    let ctx = test_scenario::ctx(&mut scenario);
    
    // Create hero asset
    let hero_name = string::utf8(b"TestHero");
    let blob_id = 123456789u256;
    let metadata_url = url::new_unsafe_from_bytes(b"https://example.com/metadata");
    
    let hero = hero_asset::create(
        hero_name,
        blob_id,
        metadata_url,
        ctx
    );
    
    hero_asset::place_in_kiosk(hero, &mut kiosk, &kiosk_cap, &policy, ctx);
    
    test_scenario::return_shared(policy);
    test_scenario::return_shared(kiosk);
    test_scenario::return_to_sender(&scenario, kiosk_cap);
    
    test_scenario::end(scenario);
}

#[test]
fun test_comic_series_creation() {
    let mut scenario = test_scenario::begin(USER);
    
    let title = string::utf8(b"The Adventures of TestHero");
    let genre = string::utf8(b"Cyberpunk Noir");
    
    let series = comic_series::create(
        title,
        genre,
        test_scenario::ctx(&mut scenario)
    );
    
    assert!(comic_series::issue_count(&series) == 0, 0);
    assert!(comic_series::creator(&series) == USER, 1);
    
    transfer::public_share_object(series);
    
    test_scenario::end(scenario);
}

#[test]
fun test_comic_issue_creation() {
    let mut scenario = test_scenario::begin(USER);
    
    // Create series
    let title = string::utf8(b"Test Series");
    let genre = string::utf8(b"Fantasy");
    let series = comic_series::create(
        title,
        genre,
        test_scenario::ctx(&mut scenario)
    );
    
    // Create issue
    let issue_title = string::utf8(b"Issue #1");
    let cover_url = url::new_unsafe_from_bytes(b"https://example.com/cover.jpg");
    let blob_id = 987654321u256;
    let mode = string::utf8(b"action");
    
    let issue = comic_issue::create(
        sui::object::id(&series),
        1,
        issue_title,
        cover_url,
        blob_id,
        option::none(),
        mode,
        test_scenario::ctx(&mut scenario)
    );
    
    assert!(comic_issue::issue_number(&issue) == 1, 0);
    assert!(comic_issue::read_count(&issue) == 0, 1);
    
    transfer::public_share_object(series);
    transfer::public_transfer(issue, USER);
    
    test_scenario::end(scenario);
}

#[test]
fun test_read_count_increment() {
    let mut scenario = test_scenario::begin(USER);
    
    // Create series and issue
    let title = string::utf8(b"Test Series");
    let genre = string::utf8(b"Fantasy");
    let series = comic_series::create(
        title,
        genre,
        test_scenario::ctx(&mut scenario)
    );
    
    let issue_title = string::utf8(b"Issue #1");
    let cover_url = url::new_unsafe_from_bytes(b"https://example.com/cover.jpg");
    let blob_id = 987654321u256;
    let mode = string::utf8(b"action");
    
    let mut issue = comic_issue::create(
        sui::object::id(&series),
        1,
        issue_title,
        cover_url,
        blob_id,
        option::none(),
        mode,
        test_scenario::ctx(&mut scenario)
    );
    
    // Increment read count
    comic_issue::increment_read_count(&mut issue);
    assert!(comic_issue::read_count(&issue) == 1, 0);
    
    comic_issue::increment_read_count(&mut issue);
    assert!(comic_issue::read_count(&issue) == 2, 1);
    
    transfer::public_share_object(series);
    transfer::public_transfer(issue, USER);
    
    test_scenario::end(scenario);
}

#[test]
fun test_vote_casting() {
    let mut scenario = test_scenario::begin(USER);
    
    // Create series and issue
    let title = string::utf8(b"Test Series");
    let genre = string::utf8(b"Fantasy");
    let series = comic_series::create(
        title,
        genre,
        test_scenario::ctx(&mut scenario)
    );
    
    let issue_title = string::utf8(b"Issue #1");
    let cover_url = url::new_unsafe_from_bytes(b"https://example.com/cover.jpg");
    let blob_id = 987654321u256;
    let mode = string::utf8(b"action");
    
    let mut issue = comic_issue::create(
        sui::object::id(&series),
        1,
        issue_title,
        cover_url,
        blob_id,
        option::none(),
        mode,
        test_scenario::ctx(&mut scenario)
    );
    
    // Cast vote
    comic_issue::cast_vote(&mut issue, 5, test_scenario::ctx(&mut scenario));
    assert!(comic_issue::vote(&issue, USER) == 5, 0);
    
    // Update vote
    comic_issue::cast_vote(&mut issue, 4, test_scenario::ctx(&mut scenario));
    assert!(comic_issue::vote(&issue, USER) == 4, 1);
    
    transfer::public_share_object(series);
    transfer::public_transfer(issue, USER);
    
    test_scenario::end(scenario);
}

