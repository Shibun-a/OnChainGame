// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/GameCore.sol";

contract FundTokenPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable gameCoreAddress = payable(vm.envAddress("GAME_CORE_ADDRESS"));
        address tokenAddress = vm.envAddress("PLATFORM_TOKEN_ADDRESS");
        uint256 amount = vm.envOr("PLATFORM_POOL_AMOUNT", uint256(100_000 * 1e18));

        vm.startBroadcast(deployerPrivateKey);

        PlatformToken token = PlatformToken(tokenAddress);
        token.mint(gameCoreAddress, amount);

        console.log("Minted", amount, "tokens to GameCore for ERC20 reward pool");


        vm.stopBroadcast();
    }
}
