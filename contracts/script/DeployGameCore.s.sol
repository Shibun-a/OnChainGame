// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GameCore.sol";

contract DeployGameCore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address vrfCoordinator = vm.envOr("VRF_COORDINATOR", address(0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625));
        bytes32 keyHash = vm.envOr("VRF_KEY_HASH", bytes32(0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c));
        
        uint256 subscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");

        vm.startBroadcast(deployerPrivateKey);

        GameCore game = new GameCore(
            vrfCoordinator,
            subscriptionId,
            keyHash
        );

        console.log("GameCore deployed at:", address(game));

        vm.stopBroadcast();
    }
}
