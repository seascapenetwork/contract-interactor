/**
 * Profit Circus game related stuff.
 * Returns eth amount and cws price
 */
let blockchain = require('./blockchain');

// send a winner set transaction
module.exports = {
    fetchPairNecessaryData: async function (lp) {
		try {
			let reserves = await lp.methods.getReserves().call();

			return {amount: parseFloat(blockchain.web3.utils.fromWei(reserves._reserve1))}
		} catch (error) {	    
	    	console.log(error);
	    	return {status: "error", message: error};
		}	
    }
};
