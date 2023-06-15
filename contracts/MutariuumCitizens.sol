// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol'; // signatures
import './lib/NFTVoucherForMulti.sol';
import './lib/NFTVoucherArray.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import 'erc721a/contracts/ERC721A.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol'; // a standard for royalties that may in the future be widely supported
import './lib/RefundVoucher.sol';

contract MutariuumCitizens is ERC721A, AccessControl, EIP712, IERC2981 {
    using ECDSA for bytes32;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE'); // this is us, we'll be giving out the vouchers

    uint256 private _currentSupply = 0;
    address private _minter;

    uint256 private _royaltyAmount;
    string private _contractURI;

    event TokenCreated(address buyer, uint256 _value, string nftId);
    event Received(address, uint256);

    constructor(
        address minter,
        string memory name, // name of the collection
        string memory symbol_name, // what the ERC721 token will be called
        string memory contractUri,
        uint256 royaltyAmount, // 0-10000; e.g. 100 === 1%
        string memory version // e.g. "1"
    ) EIP712(name, version) ERC721A(name, symbol_name) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, minter);

        _minter = minter;
        _contractURI = contractUri;
        _royaltyAmount = royaltyAmount;
    }

    // Verifies the signature for a given NFTVoucher, returning the address of the signer.
    // Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    function _verifyNFTVoucherMulti(
        NFTVoucherArrayLib.NFTVoucherArray calldata voucher, // an NFTVoucher describing multiple unminted NFTs.
        bytes memory signature // an EIP712 signature of the given voucher.
    ) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(NFTVoucherArrayLib.hash(voucher));
        address signer = ECDSA.recover(digest, signature);

        // make sure that the signer is authorized to mint NFTs
        require(
            hasRole(MINTER_ROLE, signer),
            'Voucher signed by an unauthorized wallet'
        );

        require(
            voucher.buyer == msg.sender,
            'Voucher is not issued for the senders wallet'
        );

        // at any time, block.number will return the block height in which the transaction is being mined
        // 40 blocks should be cca 10 minutes, after that the voucher is considered too old
        require(
            block.number - voucher.currBlockNumber <= 40,
            'Voucher is expired'
        );

        return signer;
    }

    function _verifyRefundVoucher(
        RefundVoucherLib.RefundVoucher calldata voucher,
        bytes memory signature
    ) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(RefundVoucherLib.hash(voucher));
        address signer = ECDSA.recover(digest, signature);

        // make sure that the signer is authorized to mint NFTs
        require(
            hasRole(MINTER_ROLE, signer),
            'Voucher signed by an unauthorized wallet'
        );

        // at any time, block.number will return the block height in which the transaction is being mined
        // 40 blocks should be cca 10 minutes, after that the voucher is considered too old
        require(
            block.number - voucher.currBlockNumber <= 40,
            'Voucher is expired'
        );

        // make sure the voucher was created for sender's wallet
        require(
            msg.sender == voucher.refunder,
            'Voucher is issued for a different wallet'
        );

        return signer;
    }

    function redeemMulti(
        NFTVoucherArrayLib.NFTVoucherArray calldata voucher, // an NFTVoucher that describes the NFTs to be redeemed.
        bytes memory signature // an EIP712 signature of the voucher, produced by the NFT creator.
    ) public payable returns (uint256) {
        // make sure signature is valid and get the address of the signer
        _verifyNFTVoucherMulti(voucher, signature);

        require(voucher.tokens.length > 0, 'At least one token required');

        // make sure that the redeemer is paying enough to cover the buyer's cost
        require(msg.value >= voucher.price, 'Insufficient funds to redeem');

        uint256 _currentIndex = _currentSupply + voucher.tokens.length;

        _safeMint(msg.sender, voucher.tokens.length);

        for (uint256 i = 0; i < voucher.tokens.length; i++) {
            // set the token URI
            uint256 tokenId = _currentIndex - voucher.tokens.length + i;
            emit TokenCreated(msg.sender, tokenId, voucher.tokens[i].nftId);
        }

        return _currentIndex;
    }

    // Refunds an NFT
    function refund(
        RefundVoucherLib.RefundVoucher calldata voucher,
        bytes memory signature
    ) public payable {
        // make sure signature is valid and get the address of the signer
        _verifyRefundVoucher(voucher, signature);

        require(balance() >= voucher.price, 'Insufficient contract balance');

        _currentSupply = _currentSupply - voucher.tokenIds.length;

        for (uint256 i = 0; i < voucher.tokenIds.length; i++) {
            require(
                msg.sender == ownerOf(voucher.tokenIds[i]),
                'Not token owner'
            );
            transferFrom(msg.sender, address(this), voucher.tokenIds[i]);
        }

        // transfer payment to caller
        payable(msg.sender).transfer(voucher.price);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // necessary override
    function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(AccessControl, ERC721A, IERC165)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // function to get funds off the contract
    function withdraw(uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= address(this).balance, 'Insufficient balance');
        payable(msg.sender).transfer(amount);
    }

    function balance() public view returns (uint256) {
        return (address(this)).balance;
    }

    // for Opensea, see https://docs.opensea.io/docs/contract-level-metadata
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    // is the same as contract uri, as tokenId is appended to make the full URI
    function _baseURI() internal view virtual override returns (string memory) {
        // concatenate with a slash
        return string(abi.encodePacked(_contractURI, '/'));
    }

    // really the only function IERC2981 standard defines;
    // only supports one royalty per token
    function royaltyInfo(
        uint256, // doesn't matter what it is as we're using contract wide royalty
        uint256 salePrice // whatever the unit, we just return the percentage of royalty
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        return (address(this), (salePrice * _royaltyAmount) / 10000);
    }
}
