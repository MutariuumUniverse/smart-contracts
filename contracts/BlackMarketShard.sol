// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol'; // signatures
import './lib/NFTVoucher.sol';
import './lib/RefundVoucher.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/interfaces/IERC2981.sol'; // a standard for royalties that may in the future be widely supported

contract BlackMarketShard is ERC721, AccessControl, EIP712, IERC2981 {
    using ECDSA for bytes32;

    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE'); // this is us, we'll be giving out the vouchers
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    uint256 private _currentSupply = 0;
    uint256 private _royaltyAmount;

    address private _minter;
    string private _contractURI;

    constructor(
        address minter,
        string memory name, // name of the collection
        string memory symbol_name, // what the ERC721 token will be called
        string memory contractUri,
        uint256 royaltyAmount, // 0-10000; e.g. 100 === 1%
        string memory version // e.g. "1"
    ) EIP712(name, version) ERC721(name, symbol_name) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, minter);

        _minter = minter;
        _contractURI = contractUri;
        _royaltyAmount = royaltyAmount;
    }

    // Verifies the signature for a given NFTVoucher, returning the address of the signer.
    // Will revert if the signature is invalid. Does not verify that the signer is authorized to mint NFTs.
    function _verifyNFTVoucher(
        NFTVoucherLib.NFTVoucher calldata voucher, // an NFTVoucher describing an unminted NFT.
        bytes memory signature // an EIP712 signature of the given voucher.
    ) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(NFTVoucherLib.hash(voucher));
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
            msg.sender == voucher.buyer,
            'Voucher is issued for a different wallet'
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

    // Redeems an NFTVoucher for an actual NFT, creating it in the process.
    function redeem(
        NFTVoucherLib.NFTVoucher calldata voucher, // an NFTVoucher that describes the NFT to be redeemed.
        bytes memory signature // an EIP712 signature of the voucher, produced by the NFT creator.
    ) public payable returns (uint256) {
        // make sure signature is valid and get the address of the signer
        _verifyNFTVoucher(voucher, signature);

        // make sure that the redeemer is paying enough to cover the buyer's cost
        require(msg.value >= voucher.price, 'Insufficient funds to redeem');

        _currentSupply = _currentSupply + 1;

        // mint token to the redeemer
        _safeMint(msg.sender, voucher.tokenId);

        return voucher.tokenId;
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

    event Received(address, uint256);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // necessary override
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl, ERC721, IERC165)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // function to get funds off the contract
    function withdraw(uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= balance(), 'Insufficient balance');
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
