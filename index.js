let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
// or server to listen to sign up
const express = require('express')
const app = express()
const port = 3000

// account
let admin = blockchain.addAccount(process.env.ACCOUNT_1);
let stakingSaloonDeployer = blockchain.addAccount(process.env.STAKING_SALOON_DEPLOYER);
let burningAdmin = blockchain.addAccount(process.env.NFTBURNING_DEPLOYER);

/**
 * NFT Brawl: We suppose that all GET parameters are valid and always passed.
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
})

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
})


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
})


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
})

app.listen(port, () => {});
