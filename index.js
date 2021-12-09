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
let stakingSaloonDeployer = blockchain.addAccount(process.env.STAKING_SALOON_DEPLOYER);
let burningAdmin = blockchain.addAccount(process.env.NFTBURNING_DEPLOYER);
let zombieAdmin = blockchain.addAccount(process.env.ZOMBIE_DEPLOYER);
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

/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	quality 		(integer)
 * 	owner 			(address)
 * 	amountWei		(integer in wei)
 * 	mintedTime		(integer)
 */
app.get('/sign-quality', async function (req, res) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	console.log('contract-interactor api of sign-quality');
	let quality = parseInt(req.query.quality);
	let owner = req.query.owner;
	let amountWei = blockchain.web3.utils.toWei(blockchain.web3.utils.fromWei(req.query.amountWei));
	let mintedTime = parseInt(req.query.mintedTime.toString());
	let nonce = parseInt(req.query.nonce.toString());

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = blockchain.web3.eth.abi.encodeParameters(["uint256", "uint256"], [amountWei, mintedTime]);
	let nonceBytes32 = blockchain.web3.eth.abi.encodeParameters(["uint256"], [nonce]);

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

	res.send(signature);
});

/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	nftId 			(integer)
 * 	scapePoints		(integer)
 */
app.get('/sign-nft-scape-points', async function (req, res) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let nftId = parseInt(req.query.nftId);
	let scapePoints = parseInt(req.query.scapePoints);

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = blockchain.web3.eth.abi.encodeParameters(["uint256", "uint256"], [nftId, scapePoints]);
	let data = blockchain.web3.utils.keccak256(bytes32);

	let signature;
	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await blockchain.web3.eth.sign(data, stakingSaloonDeployer.address);
	} catch (e) {
		signature = "";
	}

	res.send(signature);
});


/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	bonus 			(integer)
 * 	nftId 			(integer)
 */
app.get('/sign-nft-staking-bonus', async function (req, res) {
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
		signature = await blockchain.web3.eth.sign(data, stakingSaloonDeployer.address);
	} catch (e) {
		signature = "";
	}

	res.send(signature);
});


app.get('/sign-scape-forum-quality', async function (req, res) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let nftId1 = parseInt(req.query.nftId1);
	let nftId2 = parseInt(req.query.nftId2);
	let nftId3 = parseInt(req.query.nftId3);
	let nftId4 = parseInt(req.query.nftId4);
	let nftId5 = parseInt(req.query.nftId5);
	let quality = parseInt(req.query.quality);
	let imgId = parseInt(req.query.imgId);
	let stakedInt = req.query.stakedInt;        //remember to update accordingly or verification will fail
	let totalStaked = blockchain.web3.utils.toWei(stakedInt, "ether");

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = blockchain.web3.eth.abi.encodeParameters(["uint256", "uint256", "uint256", "uint256", "uint256", "uint256","uint256"], [nftId1, nftId2, nftId3, nftId4, nftId5, totalStaked,imgId]);
	let bytes1 = blockchain.web3.utils.bytesToHex([quality]);

	let str = bytes32 + bytes1.substr(2);
	let data = blockchain.web3.utils.keccak256(str);


	let signature;
	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await blockchain.web3.eth.sign(data, burningAdmin.address);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: " + signature);


	res.send(signature);
});

app.get('/sign-zombie-farm-nft-token', async function (req, res) {
	let amount = blockchain.web3.utils.toWei(req.query.amount, "ether");
	let nftId = parseInt(req.query.nftId);
	let nonce = parseInt(req.query.nonce.toString());


	let bytesOnce = blockchain.web3.eth.abi.encodeParameters(["uint256", "uint256", "uint256"], [nftId,amount,nonce]);

	let dataOnce = blockchain.web3.utils.keccak256(bytesOnce);

	let signature;
	try {
		signature = await blockchain.web3.eth.sign(dataOnce, zombieAdmin.address);
	} catch (e) {
		signature = "";
	}

	let dot = signDot(signature);

	let bytesTwice = blockchain.web3.eth.abi.encodeParameters(["uint256","uint8","bytes32","bytes32","uint256"], [amount,dot.v,dot.r,dot.s,nftId]);

	res.send(bytesTwice);
});


app.get('/sign-zombie-farm-nft', async function (req, res) {
	let weight = parseInt(req.query.weight);
	let nftId = parseInt(req.query.nftId);
	let nonce = parseInt(req.query.nonce.toString());


	let bytesOnce = blockchain.web3.eth.abi.encodeParameters(["uint256", "uint256", "uint256"], [nftId,weight,nonce]);

	let dataOnce = blockchain.web3.utils.keccak256(bytesOnce);

	let signature;
	try {
		signature = await blockchain.web3.eth.sign(dataOnce, zombieAdmin.address);
	} catch (e) {
		signature = "";
	}

	let dot = signDot(signature);

	let bytesTwice = blockchain.web3.eth.abi.encodeParameters(["uint8","bytes32","bytes32","uint256","uint256"], [dot.v,dot.r,dot.s,nftId,weight]);

	res.send(bytesTwice);
});


app.get('/sign-zombie-farm-nfts', async function (req, res) {
	let nftId1 = parseInt(req.query.nftId1);
	let nftId2 = parseInt(req.query.nftId2);
	let nftId3 = parseInt(req.query.nftId3);
	let nftId4 = parseInt(req.query.nftId4);
	let nftId5 = parseInt(req.query.nftId5);

	let weight1 = parseInt(req.query.weight1);
	let weight2 = parseInt(req.query.weight3);
	let weight3 = parseInt(req.query.weight3);
	let weight4 = parseInt(req.query.weight4);
	let weight5 = parseInt(req.query.weight5);

	let nonce = parseInt(req.query.nonce.toString());

	let nftIds = [nftId1,nftId2,nftId3,nftId4,nftId5];
	let weights = [weight1,weight2,weight3,weight4,weight5];

	let bytesOnce = blockchain.web3.eth.abi.encodeParameters(["uint256[5]", "uint256[5]", "uint256"], [nftIds,weights,nonce]);

	let dataOnce = blockchain.web3.utils.keccak256(bytesOnce);

	let signature;
	try {
		signature = await blockchain.web3.eth.sign(dataOnce, zombieAdmin.address);
	} catch (e) {
		signature = "";
	}

	let dot = signDot(signature);

	let bytesTwice = blockchain.web3.eth.abi.encodeParameters(["uint8","bytes32","bytes32","uint256[5]","uint256[5]"], [dot.v,dot.r,dot.s,nftIds,weights]);

	res.send(bytesTwice);
});



let signDot = (sign) => {
	//r,s,v
	let r = sign.substr(0,66);
	let s = '0x' + sign.substr(66,64);
	let v = parseInt(sign.substr(130),16);
	if (v < 27) {
		v += 27;
	}
	return {r: r,s: s,v: v}
};

app.listen(port, () => {
    //schedule.scheduleJob('0 * * * * *', execDailyLeaderboard);
    //schedule.scheduleJob('0 0 * * * *', execAllTimeLeaderboard);
});
