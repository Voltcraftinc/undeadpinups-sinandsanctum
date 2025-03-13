// staking.hpp

#pragma once

#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
#include <vector>
#include <string>

using namespace eosio;
using std::string;
using std::vector;

/**
 * Simple NFT staking contract for the "undeadpinups" collection.
 * Rewards are paid in WYNX (2 decimals).
 * 
 * You can stake either by calling our stake(...) action
 * or by sending atomicassets::transfer with memo="deposit".
 */
CONTRACT staking : public contract
{
public:
   using contract::contract;

   // (A) Direct stake action
   ACTION stake(name user, vector<uint64_t> asset_ids);

   // (B) On-notify for atomicassets::transfer
   [[eosio::on_notify("atomicassets::transfer")]]
   void ontransfer(name from,
                   name to,
                   vector<uint64_t> asset_ids,
                   string memo);

   ACTION claim(name user, uint64_t asset_id);
   ACTION unstake(name user, uint64_t asset_id);

private:
   static constexpr eosio::name COLLECTION_NAME = "undeadpinups"_n;

   // daily reward rates for certain template_ids
   uint64_t get_reward_rate(uint64_t template_id)
   {
      // group #1 => 10.00 WYNX/day => 1000 minimal units
      if (template_id == 877575 ||
          template_id == 877566 ||
          template_id == 877565 ||
          template_id == 877564)
      {
         return 1000; // 10.00 WYNX/day
      }

      // group #2 => 30.00 WYNX/day => 3000
      if (template_id == 877256 || template_id == 877255 || /* ... etc ... */ 
          template_id == 877195)
      {
         return 3000; // 30.00 WYNX/day
      }

      // otherwise => 0
      return 0;
   }

   // Table storing each staked NFT
   TABLE stake_info
   {
      uint64_t asset_id;    // PK
      name owner;           // staker
      uint64_t template_id; // for reward
      uint32_t staked_at;
      uint32_t last_claimed;

      uint64_t primary_key() const { return asset_id; }
      uint64_t by_owner() const { return owner.value; }
   };

   typedef multi_index<
       "stakes"_n,
       stake_info,
       indexed_by<"byowner"_n, const_mem_fun<stake_info, uint64_t, &stake_info::by_owner>>>
       stakes_table;

   // Minimal structure to read from atomicassets::assets table
   struct [[eosio::table]] asset_row
   {
      uint64_t asset_id;
      name owner;
      name collection_name;
      name schema_name;
      int32_t template_id;
      name ram_payer;
      vector<asset> backed_tokens;
      vector<uint8_t> immutable_serialized_data;
      vector<uint8_t> mutable_serialized_data;

      uint64_t primary_key() const { return asset_id; }
   };
   typedef multi_index<"assets"_n, asset_row> atomicassets_table;

   // Helper to compute reward
   asset calculate_reward(const stake_info &srec);
};
