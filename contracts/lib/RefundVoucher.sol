// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol'; // signatures

library RefundVoucherLib {
    bytes32 public constant VOUCHER_HASH =
        keccak256(
            'RefundVoucher(address refunder,uint256 price,uint256[] tokenIds,uint256 currBlockNumber)'
        );

    // represents an un-minted NFT, which has not yet been recorded into the blockchain.
    // a signed voucher can be redeemed for a real NFT using the redeem function.
    struct RefundVoucher {
        address refunder; // the wallet that this voucher is for
        uint256 price;
        uint256[] tokenIds; // must be unique - if another token with this ID already exists, the redeem function will revert
        uint256 currBlockNumber;
    }

    function hashStringArray(string[] calldata array)
        internal
        pure
        returns (bytes32 result)
    {
        bytes32[] memory _array = new bytes32[](array.length);
        for (uint256 i = 0; i < array.length; ++i) {
            _array[i] = keccak256(bytes(array[i]));
        }
        result = keccak256(abi.encodePacked(_array));
    }

    function hash(RefundVoucher calldata part) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    VOUCHER_HASH,
                    part.refunder,
                    part.price,
                    keccak256(abi.encodePacked(part.tokenIds)),
                    part.currBlockNumber
                )
            );
    }
}
