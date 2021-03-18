let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
let dailyLeaderboard = require('./daily_leaderboard');
const schedule = require('node-schedule');

// or server to listen to sign up
const express = require('express')
const app = express()
const port = 3000

// account
let admin = blockchain.addAccount(process.env.ACCOUNT_1);

let crowns;
let nftRush;
let getCrowns = async function() {
	if (!crowns) {
		crowns = await blockchain.loadCrowns();
	}
	return crowns;
};

let getNftRush = async function() {
	if (!nftRush) {
		nftRush = await blockchain.loadNftRush();
	}
	return nftRush;
};

let execDailyLeaderboard = async function() {
	let data = await dailyLeaderboard.calculateDailyWinners();

	let approvement = await approveCrowns(data, 'daily');
	if (approvement === false) {
		console.log("Failed to approve required amount of CWS. Not enough balance");
		return;
	}

	let nftRush = await getNftRush();

	console.log(data);


	let txid = await dailyLeaderboard.setDailyLeaderboard(nftRush, data, admin);
	console.log("Daily leaderboard winners announnced! Txid: ", txid, " for ", admin.address);

	//let claimed = await dailyLeaderboard.claimSpents(nftRush, admin);
	//console.log("Claimed daily leaderboard txid: "+claimed);
};

let calculateTotalPrize = function(data, type) {
	if (!data) {
		return 0;
	}

	let spentPrizes = [];
	let mintedPrizes = [];
	if (type === 'daily') {
		spentPrizes = JSON.parse(process.env.NFT_RUSH_DAILY_SPENT_PRIZES);
		mintedPrizes = JSON.parse(process.env.NFT_RUSH_DAILY_MINTED_PRIZES);
	} else {
		spentPrizes = JSON.parse(process.env.NFT_RUSH_ALLTIME_SPENT_PRIZES);
		mintedPrizes = JSON.parse(process.env.NFT_RUSH_ALLTIME_MINTED_PRIZES);
	}

    let total = 0;

	// spent
	for(var i = 0; i<data.spent_amount; i++) {
		total += spentPrizes[i];
    }
	for(var i = 0; i<data.minted_amount; i++) {
		total += mintedPrizes[i];
    }

    return total;
};

let approveCrowns = async function(data, type) {
    // for now all type of leaderboard reward players with the same amount of
    // CWS tokens.
    // in the next versions, approving CWS tokens should be in the leaderboard blocks
    var totalPrize = blockchain.web3.utils.toWei(calculateTotalPrize(data, type).toString());

	if (totalPrize <= 0) {
		console.log(`No ${type} total prize. Probably no winners`);
		return 0;
	}

	const gasPrice = await blockchain.web3.eth.getGasPrice();

    var approveGasEstimate = null;

	let crowns = await getCrowns();
	let nftRush = await getNftRush();

	try {
     	approveGasEstimate = await crowns.methods.approve(nftRush._address, totalPrize).estimateGas({ from: admin.address });    
    } catch (e) {
		console.log("Failed to count approvement!");
		console.error(e);
		return false;
    }


    try {
      	await crowns.methods.approve(nftRush._address, totalPrize).send({from: admin.address, gasPrice: gasPrice, gas: approveGasEstimate * 3});
    } catch (e) {
		console.error(e);
		return false;
    }

    return true;
};

// uncomment/comment to execute leaderboard immiadetely
//execDailyLeaderboard();

/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	quality 		(integer)
 * 	owner 			(address)
 * 	amountWei		(integer in wei)
 * 	mintedTime		(integer)
 */
app.get('/sign-quality', async function(req, res) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let quality = parseInt(req.query.quality);
	let owner = req.query.owner;
	let amountWei = blockchain.web3.utils.toWei(blockchain.web3.utils.fromWei(req.query.amountWei));
	let mintedTime = parseInt(req.query.mintedTime.toString());
	let nonce = parseInt(req.query.nonce.toString());

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = blockchain.web3.eth.abi.encodeParameters(["uint256", "uint256"],[amountWei, mintedTime]);
	let nonceBytes32 = blockchain.web3.eth.abi.encodeParameters(["uint256"],[nonce]);

	let bytes1 = blockchain.web3.utils.bytesToHex([quality]);
	let str = owner + bytes32.substr(2) + bytes1.substr(2) + nonceBytes32.substr(2);
	let data = blockchain.web3.utils.keccak256(str);


	let signature;
	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await blockchain.web3.eth.sign(data, admin.address);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: "+signature);


	res.send(signature);
})

/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	nftId 			(integer)
 * 	scapePoints		(integer)
 */
 app.get('/sign-nft-scape-points', async function(req, res) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let nftId = parseInt(req.query.nftId);
	let scapePoints = parseInt(req.query.scapePoints);

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = blockchain.web3.eth.abi.encodeParameters(["uint256", "uint256"],[nftId, scapePoints]);
	let data = blockchain.web3.utils.keccak256(bytes32);

	let signature;
	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await blockchain.web3.eth.sign(data, admin.address);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: "+signature);


	res.send(signature);
})


/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	bonus 			(integer)
 * 	nftId 			(integer)
 */
 app.get('/sign-nft-staking-bonus', async function(req, res) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let bonus = parseInt(req.query.bonus);
	let nftId1 = parseInt(req.query.nftId1);
	let nftId2 = parseInt(req.query.nftId2);
	let nftId3 = parseInt(req.query.nftId3);

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = blockchain.web3.eth.abi.encodeParameters(
		["uint256", "uint256", "uint256", "uint256"],
		[bonus, nftId1, nftId2, nftId3]);
	let data = blockchain.web3.utils.keccak256(bytes32);

	let signature;
	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await blockchain.web3.eth.sign(data, admin.address);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: "+signature);


	res.send(signature);
})



app.listen(port, () => {
	schedule.scheduleJob('0 0 * * *', execDailyLeaderboard);
});
