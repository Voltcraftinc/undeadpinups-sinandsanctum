#pragma once

#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/singleton.hpp>
#include <vector>
#include <string>

using namespace eosio;
using std::string;
using std::vector;

// AtomicAssets tables structure for verification
namespace atomicassets {
    struct assets_s {
        uint64_t asset_id;
        name collection_name;
        name schema_name;
        int32_t template_id;
        name ram_payer;
        vector<asset> backed_tokens;
        vector<uint8_t> immutable_serialized_data;
        vector<uint8_t> mutable_serialized_data;

        uint64_t primary_key() const { return asset_id; }
    };
    typedef multi_index<"assets"_n, assets_s> assets_t;
}

/**
 * SIMPLE NON-CUSTODIAL NFT STAKING CONTRACT
 * - NFTs remain in the user's wallet.
 * - When a user stakes an NFT, the contract verifies ownership via AtomicAssets.
 * - Rewards in SIRE (4 decimals) are earned per hour.
 */
class [[eosio::contract("sirestaking")]] sirestaking : public contract {
public:
    using contract::contract;

    // Initialize contract configs
    [[eosio::action]]
    void init(name token_contract, name atomicassets_contract, name collection_name);

    // Stake one or more NFTs.
    [[eosio::action]]
    void stake(name user, vector<uint64_t> asset_ids);

    // Claim accrued SIRE rewards for a staked NFT.
    [[eosio::action]]
    void claim(name user, uint64_t asset_id);

    // Unstake an NFT (final claim then remove staking record).
    [[eosio::action]]
    void unstake(name user, uint64_t asset_id);

    // Add new template with a specific reward rate
    [[eosio::action]]
    void addtemplate(uint64_t template_id, uint64_t hourly_rate);

    // Remove a template from eligible templates
    [[eosio::action]]
    void rmtemplate(uint64_t template_id);

private:
    // Config table to store settings
    struct [[eosio::table]] config {
        name token_contract;
        name atomicassets_contract;
        name collection_name;
    };
    typedef singleton<"config"_n, config> config_table;
    
    // Templates table to store eligible templates and their rewards
    struct [[eosio::table]] template_info {
        uint64_t template_id;
        uint64_t hourly_rate;  // In token precision units (e.g., 1000 = 10.00 SIRE)
        
        uint64_t primary_key() const { return template_id; }
    };
    typedef multi_index<"templates"_n, template_info> templates_table;

    // Table to store staking info.
    struct [[eosio::table]] stake_info {
        uint64_t asset_id;     // Primary key: the NFT's asset ID.
        name owner;            // Who staked the NFT.
        int32_t template_id;   // For reward calculation.
        uint32_t staked_at;    // When staking began.
        uint32_t last_claimed; // Last time rewards were claimed.

        uint64_t primary_key() const { return asset_id; }
        uint64_t by_owner() const { return owner.value; }
    };
    
    typedef multi_index<"stakes"_n, stake_info,
        indexed_by<"byowner"_n, const_mem_fun<stake_info, uint64_t, &stake_info::by_owner>>
    > stakes_table;

    // Get the reward rate from templates table
    uint64_t get_reward_rate(int32_t template_id);
    
    // Check if an NFT belongs to the specified collection and is owned by the user
    bool verify_nft_ownership(name owner, uint64_t asset_id, int32_t& template_id);
    
    // Calculate how many SIRE are owed since last claim.
    asset calculate_reward(const stake_info& s);
    
    // Helper to get contract configuration
    config get_config();
};