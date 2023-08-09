// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract MutariuumCore {

    error Unauthorized();
    error NotImplemented();

    address owner;
    mapping(bytes4 => address) private _handlers;

    constructor() {
        owner = msg.sender;
    }

    function setHandler(bytes4 selector, address handler) external {
        if (msg.sender != owner) {
            revert Unauthorized();
        }
        _handlers[selector] = handler;
    }

    fallback() external payable {
        bytes4 selector = bytes4(msg.data);
        if (_handlers[selector] == address(0)) {
            revert NotImplemented();
        }
        _handlers[selector].call{ value: msg.value }(msg.data);
    }
}
