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
 * Rewards are paid in WYNX (2 decimal places). 
 * Contract must hold enough WYNX to pay out rewards.
 *
 * You will:
 *  1) Deploy this to your contract account (e.g. "wynxcbyte.gm").
 *  2) Make sure the contract’s account has a WYNX balance in "eosio.token".
 *  3) Users stake by sending their NFT(s) via atomicassets::transfer, with memo="deposit".
 *  4) They can then claim or unstake to retrieve rewards & NFT(s).
 */
CONTRACT staking : public contract {
public:
   using contract::contract;

   /**
    * Listen for `atomicassets::transfer` actions. 
    * If `to == get_self()` and `memo == "deposit"`, stake those NFTs.
    */
   [[eosio::on_notify("atomicassets::transfer")]]
   void stake( name from, 
               name to, 
               vector<uint64_t> asset_ids, 
               string memo );

   /**
    * Claim the accumulated WYNX rewards for a single staked NFT.
    *
    * @param user     - the staker’s account
    * @param asset_id - the NFT’s asset_id that is staked
    */
   ACTION claim( name user, uint64_t asset_id );

   /**
    * Unstake a single NFT. Automatically claims pending rewards, 
    * then transfers the NFT back.
    *
    * @param user     - the staker’s account
    * @param asset_id - the NFT’s asset_id that is staked
    */
   ACTION unstake( name user, uint64_t asset_id );

private:
   // The collection we accept (change if needed)
   static constexpr eosio::name COLLECTION_NAME = "undeadpinups"_n;

   /**
    * Return daily reward rate (in minimal units) for each template ID.
    * e.g. 10.00 WYNX/day => 1000 if WYNX has 2 decimals.
    * The list below has:
    *  - Group #1 => 10 WYNX/day => 1000 in minimal units
    *  - Group #2 => 30 WYNX/day => 3000 in minimal units
    */
   uint64_t get_reward_rate( uint64_t template_id ) {
      // Group #1 => 10.00 WYNX/day => 1000
      if (  template_id == 877575 
         || template_id == 877566 
         || template_id == 877565 
         || template_id == 877564 )
      {
         return 1000; // 10.00 WYNX/day
      }

      // Group #2 => 30.00 WYNX/day => 3000
      // (Full list of template IDs you mentioned for 30/day)
      if (  template_id == 877256 || template_id == 877255 || template_id == 877254
         || template_id == 877253 || template_id == 877252 || template_id == 877251
         || template_id == 877250 || template_id == 877249 || template_id == 877248
         || template_id == 877215 || template_id == 877214 || template_id == 877213
         || template_id == 877212 || template_id == 877211 || template_id == 877210
         || template_id == 877209 || template_id == 877208 || template_id == 877207
         || template_id == 877206 || template_id == 877205 || template_id == 877204
         || template_id == 877203 || template_id == 877202 || template_id == 877201
         || template_id == 877200 || template_id == 877199 || template_id == 877198
         || template_id == 877197 || template_id == 877196 || template_id == 877195 )
      {
         return 3000; // 30.00 WYNX/day
      }

      // Otherwise => 0 means “not eligible”
      return 0;
   }

   /**
    * Table storing each staked NFT.
    */
   TABLE stake_info {
      uint64_t asset_id;      // PK = the NFT asset id
      name     owner;         // staker’s WAX account
      uint64_t template_id;   // for reward calculation
      uint32_t staked_at;     // time staked (seconds)
      uint32_t last_claimed;  // time of last reward claim

      uint64_t primary_key() const { return asset_id; }
      uint64_t by_owner()     const { return owner.value; }
   };

   typedef multi_index< "stakes"_n, stake_info,
      indexed_by< "byowner"_n, const_mem_fun< stake_info, uint64_t, &stake_info::by_owner >>
   > stakes_table;

   /**
    * Minimal structure to read from atomicassets::assets table.
    * We'll do a find by asset_id to check collection & template_id.
    */
   struct [[eosio::table]] asset_row {
      uint64_t          asset_id;
      name              owner;
      name              collection_name;
      name              schema_name;
      int32_t           template_id;
      name              ram_payer;
      vector<asset>     backed_tokens;
      vector<uint8_t>   immutable_serialized_data;
      vector<uint8_t>   mutable_serialized_data;

      uint64_t primary_key() const { return asset_id; }
   };
   typedef multi_index< "assets"_n, asset_row > atomicassets_table;

   /**
    * Helper to compute how many WYNX are owed since last_claimed.
    */
   asset calculate_reward( const stake_info& srec ) {
      uint32_t now_sec = current_time_point().sec_since_epoch();
      uint32_t elapsed = (now_sec > srec.last_claimed) 
                           ? (now_sec - srec.last_claimed) 
                           : 0;

      // daily rate in minimal units
      uint64_t rate = get_reward_rate( srec.template_id ); 
      // reward_units = (elapsed_seconds * daily_rate) / 86400
      uint64_t reward_units = ( (uint64_t) elapsed * rate ) / 86400; 

      // WYNX has 2 decimals => create asset with symbol WYNX,2
      return asset( reward_units, symbol("WYNX", 2) );
   }
};
