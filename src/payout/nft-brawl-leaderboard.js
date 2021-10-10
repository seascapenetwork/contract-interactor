let dailyLeaderboard = require('./daily_leaderboard');
let allTimeLeaderboard = require('./alltime_leaderboard');

let crowns;
let nftRush;

let execDailyLeaderboard = async function () {
	let data = await dailyLeaderboard.calculateDailyWinners();
	if (!data) {
		return;
	}

	let approvement = await approveCrowns(data, 'daily');
	if (approvement === false) {
		console.log("Failed to approve required amount of CWS. Not enough balance");
		return;
	}

	let nftRush = await getNftRush();

	console.log(data);


	let txid = await dailyLeaderboard.setDailyLeaderboard(nftRush, data, admin);
	console.log("Daily leaderboard winners announnced! Txid: ", txid, " for ", admin.address);
};

let execAllTimeLeaderboard = async function () {
	let data = await allTimeLeaderboard.calculateAllTimeWinners();
	if (!data) {
		return;
	}

	let approvement = await approveCrowns(data, 'alltime');
	if (approvement === false) {
		console.log("Failed to approve required amount of CWS. Not enough balance");
		return;
	}

	let nftRush = await getNftRush();

	console.log(data);


	let txid = await allTimeLeaderboard.setAllTimeLeaderboard(nftRush, data, admin);
	console.log("All Time leaderboard winners announnced! Txid: ", txid, " for ", admin.address);
};

let calculateTotalPrize = function (data, type) {
	if (!data) {
		return 0;
	}

	let prizes = [];
	if (type === 'daily') {
		prizes = JSON.parse(process.env.NFT_RUSH_DAILY_SPENT_PRIZES);
	} else {
		prizes = JSON.parse(process.env.NFT_RUSH_ALLTIME_MINTED_PRIZES);
	}

	let total = 0;

	let amount = data.spent_amount;
	if (type === 'alltime') {
		amount = data.minted_amount;
	}

	for (var i = 0; i < amount; i++) {
		total += prizes[i];
	}

	return total;
};

let approveCrowns = async function (data, type) {
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
		await crowns.methods.approve(nftRush._address, totalPrize).send({ from: admin.address, gasPrice: gasPrice, gas: approveGasEstimate * 3 });
	} catch (e) {
		console.error(e);
		return false;
	}

	return true;
};

let getCrowns = async function () {
	if (!crowns) {
		crowns = await blockchain.loadCrowns();
	}
	return crowns;
};

let getNftRush = async function () {
	if (!nftRush) {
		nftRush = await blockchain.loadNftRush();
	}
	return nftRush;
};
