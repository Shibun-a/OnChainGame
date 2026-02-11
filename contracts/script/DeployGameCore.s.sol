// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GameCore.sol";

contract DeployGameCore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        address vrfCoordinator = vm.envOr("VRF_COORDINATOR", address(0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B));
        bytes32 keyHash = vm.envOr("VRF_KEY_HASH", bytes32(0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae));
        
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
