// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import "./../../lib/Base64.sol";

/// @title Library for storing SVG image of veNFT.
library VeLogo {
    /// @dev Return SVG logo of veNFT.
    function tokenURI(
        uint _tokenId,
        uint _balanceOf,
        uint untilEnd,
        uint _value
    ) public pure returns (string memory output) {
        output = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 600 900" style="enable-background:new 0 0 600 900;" xml:space="preserve"><style type="text/css">.st0{fill:#0092FF;}.st1{fill:#386BA8;}.st2{fill:#5CD2F7;}.st3{fill:#00B6E4;enable-background:new    ;}.st4{fill:#00B6E4;}.st5{fill:#0080DF;enable-background:new    ;}.st6{fill:#0080DF;}</style><rect class="st0" width="600" height="900"/><rect x="55" y="424" class="st1" width="544" height="98"/><rect y="544" class="st1" width="517" height="98"/><rect y="772" class="st1" width="516" height="98"/><rect x="55" y="658" class="st1" width="544" height="98"/><path class="st2" d="M62.2,419.7v97.8c0,0.5,0.4,0.9,0.9,0.9H600v-1.8H64v-96h536v-1.8H63.1C62.6,418.8,62.2,419.2,62.2,419.7z"/><path class="st2" d="M62.2,651.8v97.8c0,0.5,0.4,0.9,0.9,0.9H600v-1.8H64v-96h536v-1.8H63.1C62.6,650.9,62.2,651.3,62.2,651.8z"/><path class="st2" d="M512.3,636.3v-97.8c0-0.5-0.4-0.9-0.9-0.9H0v1.8h510.5v96H0v1.8h511.4C511.9,637.2,512.3,636.8,512.3,636.3z"/><path class="st2" d="M512.3,863.8V766c0-0.5-0.4-0.9-0.9-0.9H0v1.8h510.5v96H0v1.8h511.4C511.9,864.7,512.3,864.3,512.3,863.8z"/><polygon class="st3" points="230.6,102.3 244.7,116.6 252.6,111.9 259.8,108.7 266.9,106.5 274.9,104 283.7,102.3 293.7,101 300.1,101 306.7,101 314.6,102.3 323,104.6 331.5,107.4 337.9,109.7 345.8,113.6 350.3,116.6 364.3,102.7 357.3,97.2 348.3,92.1 334.7,86.7 319.5,83.1 307.4,81.2 300.1,81.2 293.1,81.2 290.1,81.2 281.2,82.1 266.7,85.1 254.9,88.9 245.4,92.9 236.5,97.8 "/><polygon class="st4" points="381.9,105.5 395,119.4 206.4,316 192.5,302.4 "/><path class="st4" d="M213,106.6"/><polygon class="st4" points="200,121.3 213.2,106.6 293.8,188.7 279.8,204.1 "/><polyline class="st4" points="194,134.5 207.1,147.3 198.2,158.9 194.4,165.3 190.9,173 187.7,182 185.4,190.6 183.9,198.3 182.9,205.3 182.9,213.1 182.3,219.7 183.1,228.7 185.1,241.6 188.1,250.6 191.7,260.5 195.2,267.2 199.2,273.6 202.2,277.3 197.1,283.7 188.9,292.9 184.7,287.9 178.8,278.8 174.9,271.6 171.7,263.4 169,256.5 166.8,249.4 164.7,239.4 163.7,231.8 163,221.2 163,213 163.5,205.6 163.7,199 165.5,186.7 168.7,176.1 173.3,163.4 178.8,153.5 183,146.3 193.1,134.5 "/><polygon class="st5" points="318.8,213.7 306.4,227.2 390.5,317.3 405.1,302.6 "/><polygon class="st6" points="403.2,133.8 390.2,147.2 396.7,155.3 403.2,165.1 407.4,173.5 410.1,181.7 411.9,187.9 413.6,194.1 414.7,200.1 415.4,204.9 416,210.2 416,219.7 416,226.8 414.6,236.2 412.8,243.7 410.7,250.4 408.4,256.6 405.3,262.5 402,269.1 398.7,273.8 394,279.7 400,286.5 406.2,293.6 413,285.6 418.7,276.7 422.9,268 425.9,260.8 428.6,253.2 430.5,246.5 431.7,240.8 432.8,233.6 433.9,227 433.9,219.2 434.1,216.5 434.1,211.3 434.1,209 433.4,202.6 432.5,196.5 431.4,189.6 430.2,184.6 429.2,179.9 427,172.9 424.6,167.3 421.7,160.5 419.2,155.7 415.1,149.2 411.6,144.1 408.6,140.1 406.8,137.6 "/><polygon class="st6" points="226.9,325.8 240.3,312.5 248.5,317.7 257.2,322.4  262.8,325.4 271.4,328.3 279.7,329.9 284.9,330.8 291.9,330.8 301.9,331.3 311.5,330.4 320.9,328.4 330.1,325.5 339.8,320.9 348.5,316.1 353.7,313.1 366.7,325 366.7,325.8 362.6,329.6 357.4,334 350.5,337.6 341.5,341.8 334.1,344.4 327.1,346.4 317.2,348.3 309.3,349.7 305.5,350.2 297.9,350.2 288.6,350.2 280.8,349.2 271.2,347.6 262.4,344.9 255.1,342.5 249.1,340 243.8,337.1 237.7,333.8 232.7,330.5 "/>';
        output = string(
            abi.encodePacked(
                output,
                '<text transform="matrix(1 0 0 1 88 463)" class="f s">ID:</text><text transform="matrix(1 0 0 1 88 502)" class="w s">',
                _toString(_tokenId),
                "</text>"
            )
        );
        output = string(
            abi.encodePacked(
                output,
                '<text transform="matrix(1 0 0 1 88 579)" class="f s">Balance:</text><text transform="matrix(1 0 0 1 88 618)" class="w s">',
                _toString(_balanceOf / 1e18),
                "</text>"
            )
        );
        output = string(
            abi.encodePacked(
                output,
                '<text transform="matrix(1 0 0 1 88 694)" class="f s">Until unlock:</text><text transform="matrix(1 0 0 1 88 733)" class="w s">',
                _toString(untilEnd / 60 / 60 / 24),
                " days</text>"
            )
        );
        output = string(
            abi.encodePacked(
                output,
                '<text transform="matrix(1 0 0 1 88 804)" class="f s">Power:</text><text transform="matrix(1 0 0 1 88 843)" class="w s">',
                _toString(_value / 1e18),
                "</text></svg>"
            )
        );

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "veXENO #',
                        _toString(_tokenId),
                        '", "description": "Locked XENO tokens", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(output)),
                        '"}'
                    )
                )
            )
        );
        output = string(
            abi.encodePacked("data:application/json;base64,", json)
        );
    }

    /// @dev Inspired by OraclizeAPI's implementation - MIT license
    ///      https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol
    function _toString(uint value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint temp = value;
        uint digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
