// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import '@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol'; // signatures

library NFTVoucherForMultiLib {
    bytes32 public constant VOUCHER_HASH =
        keccak256('NFTVoucher(string nftId)');

    // represents an un-minted NFT, which has not yet been recorded into the blockchain.
    // a signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        string nftId; // the metadata URI to associate with this token
    }

    function hash(NFTVoucher memory part) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    VOUCHER_HASH,
                    keccak256(abi.encodePacked(part.nftId))
                )
            );
    }
}
