// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library MutariuumPackedStructs {

    enum LandType {
        URBAN,
        RURAL,
        BARREN,
        UNDERWORLD,
        ELYSIUM
    }

    enum BusinessType {
        HOSPITALITY,
        MANUFACTURING,
        SERVICES,
        FARMING,
        HUSBANDRY,
        LOGISTICS,
        PROCESSING,
        SCAVENGING,
        ENERGY,
        CRIMINAL,
        ENTERTAINMENT,
        GAMBLING,
        SCIENCE,
        BUSINESS,
        TECHNOLOGY
    }

    struct Tile {
        uint32 x;
        uint32 y;
        uint8 landType;
        uint8 business1Type;
        uint8 business1level;
        uint8 business1Capacity;
        uint8 business2Type;
        uint8 business2level;
        uint8 business2Capacity;
        uint8 business3Type;
        uint8 business3level;
        uint8 business3Capacity;
        uint8 exhaustionLevel;

    }

}
