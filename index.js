let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
let dailyLeaderboard = require('./daily_leaderboard');
const schedule = require('node-schedule');
const { exec } = require('child_process');

// account
let nftRushOwner = blockchain.addAccount(process.env.ACCOUNT_1);

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


	let txid = await dailyLeaderboard.setDailyLeaderboard(nftRush, data, nftRushOwner);
	console.log("Daily leaderboard winners announnced! Txid: ", txid, " for ", nftRushOwner.address);

	//let claimed = await dailyLeaderboard.claimSpents(nftRush, nftRushOwner);
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
     	approveGasEstimate = await crowns.methods.approve(nftRush._address, totalPrize).estimateGas({ from: nftRushOwner.address });    
    } catch (e) {
		console.log("Failed to count approvement!");
		console.error(e);
		return false;
    }


    try {
      	await crowns.methods.approve(nftRush._address, totalPrize).send({from: nftRushOwner.address, gasPrice: gasPrice, gas: approveGasEstimate * 3});
    } catch (e) {
		console.error(e);
		return false;
    }

    return true;
};

// uncomment/comment to execute leaderboard immiadetely
//execDailyLeaderboard();

schedule.scheduleJob('0 0 * * *', execDailyLeaderboard);
