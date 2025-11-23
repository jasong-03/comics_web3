module infinite_heroes::admin;

use sui::object;
use sui::tx_context;



// === Errors ===

// === Structs ===

/// Admin capability for protocol administration
/// This should be created during package initialization and transferred to the admin
public struct AdminCap has key, store {
    id: UID,
}

// === Package Functions ===

fun init(ctx: &mut TxContext) {
    let admin_cap = create(ctx);
    transfer::public_transfer(admin_cap, tx_context::sender(ctx));
}

/// Creates an admin capability
/// This should be called during package initialization
public fun create(ctx: &mut TxContext): AdminCap {
    AdminCap {
        id: object::new(ctx),
    }
}

/// Transfers the admin capability to the specified address
public fun transfer_to(admin_cap: AdminCap, admin: address) {
    transfer::transfer(admin_cap, admin);
}

// === View Functions ===

/// Verifies if an address has admin capability
/// Note: This is a helper function, actual authorization should be done
/// by requiring AdminCap as a parameter in admin functions
public fun verify_admin(_cap: &AdminCap): bool {
    true
}

