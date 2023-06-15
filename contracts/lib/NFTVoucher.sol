// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol'; // signatures

library NFTVoucherLib {
    bytes32 public constant VOUCHER_HASH =
        keccak256(
            'NFTVoucher(uint256 tokenId,uint256 price,address buyer,uint256 currBlockNumber)'
        );

    // represents an un-minted NFT, which has not yet been recorded into the blockchain.
    // a signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        uint256 tokenId; // must be unique - if another token with this ID already exists, the redeem function will revert
        uint256 price;
        address buyer; // the wallet that this voucher is for
        uint256 currBlockNumber;
    }

    function hash(NFTVoucher memory part) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    VOUCHER_HASH,
                    part.tokenId,
                    part.price,
                    part.buyer,
                    part.currBlockNumber
                )
            );
    }
}
