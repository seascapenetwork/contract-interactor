/**
 * Profit Circus game related stuff.
 * Returns eth amount and cws price
 */
let blockchain = require('./blockchain');
const got = require('got');
const UNISWAP = require('@uniswap/sdk')

// send a winner set transaction
module.exports = {
    fetchPairNecessaryData: async function (ethPrice, netId, crownsAddress) {
	try {
	    const _CROWNS = new UNISWAP.Token(netId,  crownsAddress, 18);
	    
	    let pair = await UNISWAP.Fetcher.fetchPairData(_CROWNS, UNISWAP.WETH[netId]);   
    
	    let ethAmount = parseFloat(pair.tokenAmounts[1].toSignificant(100));
	    
	    let cwsPrice = pair.token0Price.toSignificant(5) * ethPrice;	    
	    return {cwsPrice: cwsPrice, ethAmount: ethAmount};	    
	} catch (error) {	    
	    console.log(error);
	    return {status: "error", message: error.response.body};
	}	
    }
};
