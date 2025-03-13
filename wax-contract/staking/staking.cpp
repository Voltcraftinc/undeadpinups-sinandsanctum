#include "staking.hpp"

using namespace eosio;
using std::vector;
using std::string;

/**
 * Handle `atomicassets::transfer`. If `to == get_self()` and memo=="deposit", we stake those NFTs.
 */
void staking::stake(name from, 
                    name to, 
                    vector<uint64_t> asset_ids, 
                    string memo) 
{
   // Only handle inbound transfers to this contract, ignoring self or outgoing
   if (to != get_self() || from == get_self()) {
      return;
   }

   check(memo == "deposit", "Incorrect memo. Use memo='deposit' to stake.");

   // We'll read from atomicassets' "assets" table. 
   // Typically, scope is "atomicassets"_n, but some setups use scope=0.
   atomicassets_table assets("atomicassets"_n, get_self().value);
   stakes_table       stakes(get_self(), get_self().value);

   uint32_t now_sec = current_time_point().sec_since_epoch();

   // For each NFT in the transfer
   for (uint64_t asset_id : asset_ids) {
      auto existing = assets.find(asset_id);
      check(existing != assets.end(), 
            "NFT not found in atomicassets table (possibly wrong scope?).");

      // Must be from the correct collection
      check(existing->collection_name == COLLECTION_NAME, 
            "NFT is not from the 'undeadpinups' collection.");

      // Must have a recognized template => nonzero daily rate
      uint64_t rate = get_reward_rate(existing->template_id);
      check(rate > 0, "NFT's template_id is not eligible for staking.");

      // Ensure not already staked
      auto itr = stakes.find(asset_id);
      check(itr == stakes.end(), "That NFT is already staked.");

      // Create new stake record
      stakes.emplace(from, [&](auto& row){
         row.asset_id     = asset_id;
         row.owner        = from;
         row.template_id  = existing->template_id;
         row.staked_at    = now_sec;
         row.last_claimed = now_sec;
      });
   }
}

/**
 * claim => user claims any pending WYNX for a single staked NFT.
 */
ACTION staking::claim(name user, uint64_t asset_id) {
   require_auth(user);

   stakes_table stakes(get_self(), get_self().value);
   auto itr = stakes.find(asset_id);
   check(itr != stakes.end(), "Stake record not found.");
   check(itr->owner == user, "You do not own this staked NFT.");

   // Calculate reward
   asset reward = calculate_reward(*itr);
   check(reward.amount > 0, "No rewards accrued yet.");

   // Update last_claimed
   uint32_t now_sec = current_time_point().sec_since_epoch();
   stakes.modify(itr, same_payer, [&](auto& row){
      row.last_claimed = now_sec;
   });

   // Inline transfer => from this contract to user
   // Ensure this contract has a WYNX balance in eosio.token
   action(
      permission_level{ get_self(), "active"_n },
      "eosio.token"_n,
      "transfer"_n,
      std::tuple{ get_self(), user, reward, string("Staking reward") }
   ).send();
}

/**
 * unstake => user claims final reward & gets the NFT returned.
 */
ACTION staking::unstake(name user, uint64_t asset_id) {
   require_auth(user);

   stakes_table stakes(get_self(), get_self().value);
   auto itr = stakes.find(asset_id);
   check(itr != stakes.end(), "Stake record not found.");
   check(itr->owner == user, "You do not own this staked NFT.");

   // Final reward
   asset reward = calculate_reward(*itr);
   if (reward.amount > 0) {
      action(
         permission_level{ get_self(), "active"_n },
         "eosio.token"_n,
         "transfer"_n,
         std::tuple{ get_self(), user, reward, string("Staking reward on unstake") }
      ).send();
   }

   // Erase stake record
   stakes.erase(itr);

   // Return NFT to user
   vector<uint64_t> asset_ids = { asset_id };
   action(
      permission_level{ get_self(), "active"_n },
      "atomicassets"_n,
      "transfer"_n,
      std::tuple{ get_self(), user, asset_ids, string("Unstaked NFT") }
   ).send();
}
