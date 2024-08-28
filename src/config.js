//Polygon Network
import { Polygon } from "@thirdweb-dev/chains";
const UNIT_OF_ACCOUNT = {
    contract:"0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    ABI: [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)"
      ],
    name: "USDT",
    decimals: 6
}



export const appConfig = {
  unitOfAccount: UNIT_OF_ACCOUNT,
  network: Polygon, 
  chainIdHexCode: '0x89',
  thirdWebClientId: process.env.NEXT_PUBLIC_THIRD_WEB_CLIENTID,
  envCheck: process.env.NEXT_PUBLIC_CHECK
};
