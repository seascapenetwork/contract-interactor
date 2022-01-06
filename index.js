let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
let dailyLeaderboard = require('./daily_leaderboard');
let allTimeLeaderboard = require('./alltime_leaderboard');
const schedule = require('node-schedule');

const seadex = require("seadexswap");
const {JsonRpcProvider} = require("@ethersproject/providers");

// or server to listen to sign up
const express = require('express');
const app = express();
const port = 3000;

// account
let admin = blockchain.addAccount(process.env.ACCOUNT_1);
let stakingSaloonDeployer = blockchain.addAccount(process.env.STAKING_SALOON_DEPLOYER);
let burningAdmin = blockchain.addAccount(process.env.NFTBURNING_DEPLOYER);
// let onsaleSigner = blockchain.addAccount(process.env.ONSALES_SIGNER);
// let zombieAdmin = blockchain.addAccount(process.env.ZOMBIE_DEPLOYER);

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
	console.log(getDate(),"-------------------------------- execAllTimeLeaderboard ------------------------------------");
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

app.get('/rib/price', async function(req, res) {
	const provider = new JsonRpcProvider(process.env.REMOTE_HTTP);
	const RIB = new seadex.Token(
		seadex.ChainId.MOONRIVER,
		process.env.RIB_ADDRESS,
		18
	);
	let rib_price;
	try {
		const pair = await seadex.Fetcher.fetchPairData(RIB, seadex.WMOVR[RIB.chainId], provider).catch(console.error);
		const route = new seadex.Route([pair], RIB);
		rib_price = route.midPrice.toSignificant(6);
	} catch(e) {
		rib_price = 0;
	}
	res.send(rib_price);
});

/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	quality 		(integer)
 * 	owner 			(address)
 * 	amountWei		(integer in wei)
 * 	mintedTime		(integer)
 */
 app.get('/sign-onsales', async function (req, res) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let sessionID = parseInt(req.query.sessionID);
	let nftID = parseInt(req.query.nftID);
	let round = parseInt(req.query.round);
	let chainID = parseInt(req.query.chainID);
	let onsales = req.query.onsales;
	let current = req.query.currency;
	let nft = req.query.nft;

	if (!onsales || !current || !nft) {
		return "";
	}
	if (isNaN(sessionID) || isNaN(nftID) || isNaN(round) || isNaN(chainID) ||
	sessionID <= 0 || nftID <= 0 || round <= 0 || chainID < 0) {
		return "";
	}

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = blockchain.web3.eth.abi.encodeParameters(
		[
			"uint256", 
			"uint256", 
			"uint256", 
			"uint256"
		], [
			sessionID,
			nftID,
			round,
			chainID
		]
	);

	let str = bytes32 + onsales.substr(2) + current.substr(2) + nft.substr(2);
	try {
		signature = await blockchain.web3.eth.sign(data, zombieAdmin.address);
	} catch (e) {
		signature = "";
	}
	res.send(signDot(signature));
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

app.get('/sign-zombie-farm-nft-token', async function (req, res) {
	let tokenAddress = req.query.tokenAddress;
	let nftAddress = req.query.nftAddress;
	let amount = blockchain.web3.utils.toWei(req.query.amount, "ether");
	let nftId = parseInt(req.query.nftId);
	let sessionId = parseInt(req.query.sessionId);


	let bytesOnce = blockchain.web3.eth.abi.encodeParameters(["uint","uint"], [sessionId,nftId]);

	let encodeStr = tokenAddress + bytesOnce.substr(2) + nftAddress.substr(2);

	let dataOnce = blockchain.web3.utils.keccak256(encodeStr);

	let signature;
	try {
		signature = await blockchain.web3.eth.sign(dataOnce, zombieAdmin.address);
	} catch (e) {
		signature = "";
	}

	let dot = signDot(signature);

	let bytesTwice = blockchain.web3.eth.abi.encodeParameters(["uint8","bytes32","bytes32","uint","uint"], [dot.v,dot.r,dot.s,nftId,amount]);

	res.send(bytesTwice);
});

app.get('/sign-zombie-farm-nft', async function (req, res) {
	let weight = parseInt(req.query.weight);
	let nftId = parseInt(req.query.nftId);
	let nftAddress = req.query.nftAddress;
	let nonce = parseInt(req.query.nonce.toString());

	let bytes1Once = blockchain.web3.eth.abi.encodeParameters(["uint", "uint"], [nftId,weight]);
	let bytes2Once = blockchain.web3.eth.abi.encodeParameters(["uint"], [nonce]);

	let dataOnce = blockchain.web3.utils.keccak256(bytes1Once + nftAddress.substr(2) + bytes2Once.substr(2));

	let signature;
	try {
		signature = await blockchain.web3.eth.sign(dataOnce, zombieAdmin.address);
	} catch (e) {
		signature = "";
	}

	let dot = signDot(signature);

	let bytesTwice = blockchain.web3.eth.abi.encodeParameters(["uint8","bytes32","bytes32","uint","uint"], [dot.v,dot.r,dot.s,nftId,weight]);

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

app.get('/single-zombie', async function (req, res) {
	let sessionId = parseInt(req.query.sessionId);
	let levelId = parseInt(req.query.levelId);
	let slotId = parseInt(req.query.slotId);
	let challenge = req.query.challenge;
	let owner = req.query.owner;

	let sessionIdBytes = blockchain.web3.eth.abi.encodeParameters(["uint256"], [sessionId]);
	let levelBytes = blockchain.web3.utils.bytesToHex([levelId]);
	let slotBytes = blockchain.web3.utils.bytesToHex([slotId]);

	let str = sessionIdBytes + levelBytes.substr(2) + slotBytes.substr(2) + challenge.substr(2) + owner.substr(2);

	let data = blockchain.web3.utils.keccak256(str);

	let signature;
	try {

		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await blockchain.web3.eth.sign(data, zombieAdmin.address);
	} catch (e) {
		signature = "";
	}
	res.send(signDot(signature));
});

app.listen(port, () => {
	execDailyLeaderboard().then(r => {console.log(r)}).catch(console.error)
	// schedule.scheduleJob('0 30 1 * * *', execDailyLeaderboard);
    // schedule.scheduleJob('1 50 3 * * *', execAllTimeLeaderboard);
});
