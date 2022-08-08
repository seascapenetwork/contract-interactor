let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
let dailyLeaderboard = require('./daily_leaderboard');
let allTimeLeaderboard = require('./alltime_leaderboard');
const schedule = require('node-schedule');


// or server to listen to sign up
const express = require('express');
const app = express();
const port = 3000;

// account
let admin = blockchain.addAccount(process.env.ACCOUNT_1);

let crowns;
let nftRush;
let getDate = function () {
	let date = new Date((new Date()).getTime()),
		Y = date.getFullYear() + '/',
		M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1) + '/',
		D = (date.getDate() < 10 ? '0'+date.getDate() : date.getDate()) + ' ',
		h = (date.getHours() < 10 ? '0'+date.getHours() : date.getHours()) + ':',
		m = (date.getMinutes() < 10 ? '0'+date.getMinutes() : date.getMinutes()) + ':',
		s = (date.getSeconds() < 10 ? '0'+date.getSeconds() : date.getSeconds());
	return Y+M+D+h+m+s;
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

let execDailyLeaderboard = async function () {
	console.log(getDate(),"====================================== execDailyLeaderboard start ===========================================");
	let data = await dailyLeaderboard.calculateDailyWinners();
	if (!data) {
		return;
	}

	let approvement = await approveCrowns(data, 'daily');
	if (approvement === false) {
		console.log(getDate(),": Failed to approve required amount of CWS. Not enough balance");
		return;
	}

	let nftRush = await getNftRush();

	console.log(getDate(),"-------------------------------- setDailyLeaderboard ------------------------------------");
	let txid = await dailyLeaderboard.setDailyLeaderboard(nftRush, data, admin);
	console.log(getDate(),": Daily leaderboard winners announnced! Txid: ", txid, " for ", admin.address);
};

let execAllTimeLeaderboard = async function () {
	console.log(getDate(),"====================================== execAllTimeLeaderboard start ===========================================");
	let data = await allTimeLeaderboard.calculateAllTimeWinners();
	if (!data) {
		return;
	}

	let approvement = await approveCrowns(data, 'alltime');
	if (approvement === false) {
		console.log(getDate(),": Failed to approve required amount of CWS. Not enough balance");
		return;
	}

	let nftRush = await getNftRush();

	console.log(data);

	console.log(getDate(),"====================================== setAllTimeLeaderboard start ===========================================");
	let txid = await allTimeLeaderboard.setAllTimeLeaderboard(nftRush, data, admin);
	console.log(getDate(),": All Time leaderboard winners announnced! Txid: ", txid, " for ", admin.address);
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
	console.log(getDate(),"====================================== approveCrowns start ===========================================");
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

	console.log(getDate(),"----------------------- approve ------------------------");
	try {
		await crowns.methods.approve(nftRush._address, totalPrize).send({ from: admin.address, gasPrice: gasPrice, gas: approveGasEstimate * 3 });
	} catch (e) {
		console.log(getDate()," approve err:",e);
		return false;
	}

	return true;
};

app.listen(port, () => {
	// execDailyLeaderboard().then(r => {console.log(r)}).catch(console.error);
    // schedule.scheduleJob('1 30 1 * * *', execDailyLeaderboard);
    // schedule.scheduleJob('1 50 3 * * *', execAllTimeLeaderboard);
});
