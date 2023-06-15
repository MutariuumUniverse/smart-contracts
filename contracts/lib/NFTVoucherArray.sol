// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import './NFTVoucherForMulti.sol';

library NFTVoucherArrayLib {
    bytes32 public constant VOUCHER_ARRAY_HASH =
        keccak256(
            'NFTVoucherArray(address buyer,uint256 amount,uint256 price,NFTVoucher[] tokens,uint256 currBlockNumber)NFTVoucher(string nftId)'
        );

    struct NFTVoucherArray {
        address buyer; // the wallet that this voucher is for
        uint256 amount;
        uint256 price;
        NFTVoucherForMultiLib.NFTVoucher[] tokens;
        uint256 currBlockNumber;
    }

    function hash(NFTVoucherArray memory voucher)
        internal
        pure
        returns (bytes32)
    {
        bytes32[] memory voucherHashArray = new bytes32[](
            voucher.tokens.length
        );

        for (uint256 i = 0; i < voucher.tokens.length; i++) {
            voucherHashArray[i] = NFTVoucherForMultiLib.hash(voucher.tokens[i]);
        }

        return
            keccak256(
                abi.encode(
                    VOUCHER_ARRAY_HASH,
                    voucher.buyer,
                    voucher.amount,
                    voucher.price,
                    keccak256(abi.encodePacked(voucherHashArray)),
                    voucher.currBlockNumber
                )
            );
    }
}
