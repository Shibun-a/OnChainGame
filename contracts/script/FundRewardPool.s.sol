// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/GameCore.sol";

contract FundRewardPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address gameCoreAddress = 0x68a0f2a2479a2E6A6D9D083fAda5a6c4824746f9;

        vm.startBroadcast(deployerPrivateKey);

        (bool success, ) = gameCoreAddress.call{value: 0.05 ether}("");
        require(success, "Transfer failed");
        console.log("Funded Reward Pool with 0.05 ETH");

        vm.stopBroadcast();
    }
}
