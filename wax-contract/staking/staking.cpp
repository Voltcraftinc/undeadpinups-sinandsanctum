// staking.cpp

#include "staking.hpp"
using namespace eosio;
using std::vector;
using std::string;

/**
 * (A) Direct ACTION stake(...) so front-end can call stake with (user, asset_ids).
 */
ACTION staking::stake(name user, vector<uint64_t> asset_ids)
{
   require_auth(user);

   // We'll store staked records in our "stakes" table
   stakes_table stakes(get_self(), get_self().value);

   uint32_t now_sec = current_time_point().sec_since_epoch();

   // For each NFT, check it in atomicassets table, ensure valid collection, etc.
   // Typically, "atomicassets"_n, scope could be user.value or 0, depending on how atomicassets is configured.
   // If your NFTs are in scope=owner, do this:
   atomicassets_table assets("atomicassets"_n, user.value);

   for (uint64_t asset_id : asset_ids)
   {
      auto existing = assets.find(asset_id);
      check(existing != assets.end(), "NFT not found in user's atomicassets table.");
      check(existing->collection_name == COLLECTION_NAME, "NFT is not from the 'undeadpinups' collection.");

      uint64_t rate = get_reward_rate(existing->template_id);
      check(rate > 0, "NFT's template_id is not eligible for staking.");

      // Ensure not already staked
      auto itr = stakes.find(asset_id);
      check(itr == stakes.end(), "That NFT is already staked.");

      // Insert new stake record
      stakes.emplace(user, [&](auto &row) {
         row.asset_id     = asset_id;
         row.owner        = user;
         row.template_id  = existing->template_id;
         row.staked_at    = now_sec;
         row.last_claimed = now_sec;
      });

      // Optionally, if you want this contract to hold the NFT, do an inline
      // transfer from user -> get_self(). But that's up to you.
   }
}

/**
 * (B) On-notify for atomicassets::transfer. If memo=="deposit", stake them automatically.
 */
[[eosio::on_notify("atomicassets::transfer")]]
void staking::ontransfer(name from,
                         name to,
                         vector<uint64_t> asset_ids,
                         string memo)
{
   // Only handle inbound transfers to this contract
   if (to != get_self() || from == get_self())
   {
      return;
   }
   check(memo == "deposit", "Incorrect memo. Use memo='deposit' to stake.");

   stakes_table stakes(get_self(), get_self().value);
   uint32_t now_sec = current_time_point().sec_since_epoch();

   // read from atomicassets, scope= get_self().value or from's scope, depending on how your atomicassets is set up
   atomicassets_table assets("atomicassets"_n, get_self().value);

   for (uint64_t asset_id : asset_ids)
   {
      auto existing = assets.find(asset_id);
      check(existing != assets.end(), "NFT not found in atomicassets table.");
      check(existing->collection_name == COLLECTION_NAME, "NFT not from undeadpinups collection.");

      uint64_t rate = get_reward_rate(existing->template_id);
      check(rate > 0, "NFT template not eligible.");

      auto itr = stakes.find(asset_id);
      check(itr == stakes.end(), "NFT already staked.");

      stakes.emplace(from, [&](auto &row) {
         row.asset_id     = asset_id;
         row.owner        = from;
         row.template_id  = existing->template_id;
         row.staked_at    = now_sec;
         row.last_claimed = now_sec;
      });
   }
}

/**
 * (C) claim => user claims pending WYNX for a single staked NFT
 */
ACTION staking::claim(name user, uint64_t asset_id)
{
   require_auth(user);

   stakes_table stakes(get_self(), get_self().value);
   auto itr = stakes.find(asset_id);
   check(itr != stakes.end(), "Stake record not found.");
   check(itr->owner == user, "You do not own this staked NFT.");

   asset reward = calculate_reward(*itr);
   check(reward.amount > 0, "No rewards accrued yet.");

   // update last_claimed
   uint32_t now_sec = current_time_point().sec_since_epoch();
   stakes.modify(itr, same_payer, [&](auto &row) {
      row.last_claimed = now_sec;
   });

   // inline transfer WYNX from this contract to user
   action(
       permission_level{get_self(), "active"_n},
       "eosio.token"_n,
       "transfer"_n,
       std::tuple{get_self(), user, reward, string("Staking reward")})
       .send();
}

/**
 * (D) unstake => final claim + return NFT to user
 */
ACTION staking::unstake(name user, uint64_t asset_id)
{
   require_auth(user);

   stakes_table stakes(get_self(), get_self().value);
   auto itr = stakes.find(asset_id);
   check(itr != stakes.end(), "Stake record not found.");
   check(itr->owner == user, "You do not own this staked NFT.");

   // final reward
   asset reward = calculate_reward(*itr);
   if (reward.amount > 0)
   {
      action(
          permission_level{get_self(), "active"_n},
          "eosio.token"_n,
          "transfer"_n,
          std::tuple{get_self(), user, reward, string("Staking reward on unstake")})
          .send();
   }

   // erase
   stakes.erase(itr);

   // return NFT
   vector<uint64_t> asset_ids = {asset_id};
   action(
       permission_level{get_self(), "active"_n},
       "atomicassets"_n,
       "transfer"_n,
       std::tuple{get_self(), user, asset_ids, string("Unstaked NFT")})
       .send();
}

/**
 * Helper to compute how many WYNX are owed
 */
asset staking::calculate_reward(const stake_info &srec)
{
   uint32_t now_sec = current_time_point().sec_since_epoch();
   uint32_t elapsed = (now_sec > srec.last_claimed) ? (now_sec - srec.last_claimed) : 0;

   uint64_t rate = get_reward_rate(srec.template_id); // daily rate in minimal units
   // reward_units = (elapsed_seconds * daily_rate) / 86400
   uint64_t reward_units = ((uint64_t)elapsed * rate) / 86400;

   // WYNX has 2 decimals => asset with symbol WYNX,2
   return asset(reward_units, symbol("WYNX", 2));
}
