// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PlatformToken.sol";
import "../src/GameCore.sol";

contract DeployPlatformToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable gameCoreAddress = payable(vm.envAddress("GAME_CORE_ADDRESS"));
        uint256 totalSupply = vm.envOr("PLATFORM_TOTAL_SUPPLY", uint256(1_000_000 * 1e18));

        vm.startBroadcast(deployerPrivateKey);

        PlatformToken token = new PlatformToken();

        token.mint(gameCoreAddress, totalSupply);

        try GameCore(gameCoreAddress).addSupportedToken(address(token)) {
        } catch {
            console.log("addSupportedToken failed - ensure caller is GameCore owner");
        }


        console.log("PlatformToken deployed at:", address(token));
        console.log("Minted", totalSupply, "to GameCore at:", gameCoreAddress);

        vm.stopBroadcast();
    }
}
