#include "sirestaking.hpp"
#include <eosio/time.hpp>

using namespace eosio;
using std::vector;
using std::string;

void sirestaking::init(name token_contract, name atomicassets_contract, name collection_name) {
    require_auth(get_self());
    
    config_table config_singleton(get_self(), get_self().value);
    check(!config_singleton.exists(), "Contract is already initialized");
    
    config_singleton.set(config{
        .token_contract = token_contract,
        .atomicassets_contract = atomicassets_contract,
        .collection_name = collection_name
    }, get_self());
}

void sirestaking::addtemplate(uint64_t template_id, uint64_t hourly_rate) {
    require_auth(get_self());
    
    templates_table templates(get_self(), get_self().value);
    auto itr = templates.find(template_id);
    
    if (itr == templates.end()) {
        templates.emplace(get_self(), [&](auto &row) {
            row.template_id = template_id;
            row.hourly_rate = hourly_rate;
        });
    } else {
        templates.modify(itr, get_self(), [&](auto &row) {
            row.hourly_rate = hourly_rate;
        });
    }
}

void sirestaking::rmtemplate(uint64_t template_id) {
    require_auth(get_self());
    
    templates_table templates(get_self(), get_self().value);
    auto itr = templates.find(template_id);
    
    check(itr != templates.end(), "Template not found");
    templates.erase(itr);
}

void sirestaking::stake(name user, vector<uint64_t> asset_ids) {
    require_auth(user);
    
    stakes_table stakes(get_self(), get_self().value);
    uint32_t now = current_time_point().sec_since_epoch();
    
    for (uint64_t id : asset_ids) {
        auto itr = stakes.find(id);
        check(itr == stakes.end(), "NFT already staked");
        
        int32_t template_id;
        bool is_valid = verify_nft_ownership(user, id, template_id);
        check(is_valid, "NFT verification failed: either not owned by you or not in the required collection");
        
        uint64_t rate = get_reward_rate(template_id);
        check(rate > 0, "This NFT template is not eligible for staking rewards");
        
        stakes.emplace(user, [&](auto &row) {
            row.asset_id = id;
            row.owner = user;
            row.template_id = template_id;
            row.staked_at = now;
            row.last_claimed = now;
        });
    }
}

void sirestaking::claim(name user, uint64_t asset_id) {
    require_auth(user);
    
    stakes_table stakes(get_self(), get_self().value);
    auto itr = stakes.find(asset_id);
    check(itr != stakes.end(), "NFT not staked");
    check(itr->owner == user, "You do not own this staked NFT");

    // Verify the NFT is still owned by the user
    int32_t template_id;
    bool is_valid = verify_nft_ownership(user, asset_id, template_id);
    check(is_valid, "NFT verification failed: you no longer own this NFT");
    
    asset reward = calculate_reward(*itr);
    check(reward.amount > 0, "No rewards accrued yet");

    uint32_t now = current_time_point().sec_since_epoch();
    stakes.modify(itr, same_payer, [&](auto &row){
        row.last_claimed = now;
    });

    // Get token contract from config
    config cfg = get_config();
    
    // Inline transfer SIRE from this contract to the user.
    action(
        permission_level{get_self(), "active"_n},
        cfg.token_contract,
        name("transfer"),
        std::make_tuple(get_self(), user, reward, string("Staking reward"))
    ).send();
}

void sirestaking::unstake(name user, uint64_t asset_id) {
    require_auth(user);
    
    stakes_table stakes(get_self(), get_self().value);
    auto itr = stakes.find(asset_id);
    check(itr != stakes.end(), "NFT not staked");
    check(itr->owner == user, "You do not own this staked NFT");

    // We don't verify ownership for unstaking since user might have 
    // transferred the NFT and just wants to clean up the staking record
    
    asset reward = calculate_reward(*itr);
    config cfg = get_config();
    
    if (reward.amount > 0) {
        action(
            permission_level{get_self(), "active"_n},
            cfg.token_contract,
            name("transfer"),
            std::make_tuple(get_self(), user, reward, string("Final staking reward"))
        ).send();
    }
    
    stakes.erase(itr);
}

bool sirestaking::verify_nft_ownership(name owner, uint64_t asset_id, int32_t& template_id) {
    config cfg = get_config();
    
    // Check AtomicAssets table to verify ownership
    atomicassets::assets_t assets(cfg.atomicassets_contract, owner.value);
    auto asset_itr = assets.find(asset_id);
    
    if (asset_itr == assets.end() || asset_itr->collection_name != cfg.collection_name) {
        return false;
    }
    
    template_id = asset_itr->template_id;
    return true;
}

uint64_t sirestaking::get_reward_rate(int32_t template_id) {
    templates_table templates(get_self(), get_self().value);
    auto itr = templates.find(template_id);
    
    if (itr != templates.end()) {
        return itr->hourly_rate;
    }
    
    return 0; // Not eligible
}

asset sirestaking::calculate_reward(const stake_info& s) {
    uint32_t now = current_time_point().sec_since_epoch();
    uint32_t elapsed = now - s.last_claimed; // seconds elapsed
    uint64_t rate = get_reward_rate(s.template_id);
    
    // Calculate reward per hour: (elapsed * rate) / 3600.
    uint64_t reward_units = (elapsed * rate) / 3600;
    return asset(reward_units, symbol("SIRE", 4));
}

sirestaking::config sirestaking::get_config() {
    config_table config_singleton(get_self(), get_self().value);
    check(config_singleton.exists(), "Contract is not initialized");
    return config_singleton.get();
}