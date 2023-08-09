// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

contract CarverCity {
    /// Mapping Packed X/Y -> Tile ID
    mapping(uint64 => uint256) private _grid;

    /// Mapping Tile ID -> packed X/Y coordinates
    mapping(uint256 => uint64) private _tiles;

    /// Mapping CitizenID -> TileID
    mapping(uint256 => uint256) private _citizen;

    constructor(){

    }
}
