/**
 *  Now, you can send the messages to sign to the http://localhost:1000/
 */

const { ethers } = require("ethers");

const signTypes = [
	"nft-brawl-quality",
	"staking-saloon-scape-points",
	"staking-saloon-bonus",
	"scape-forum-quality"
];


//////////////////////////////////////////////////////////////////////////////////////////////
//
// Validation
//
//////////////////////////////////////////////////////////////////////////////////////////////

let validateNftBrawlQualityParams = function(params) {
	if (!params.quality) {
		return `Missing params.quality`;
	} else if (!params.owner) {
		return `Missing params.owner`;
	} else if (!params.amountWei) {
		return `Missing params.amountWei`;
	} else if (!params.mintedTime) {
		return `Missing params.mintedTime`;
	} else if (params.nonce === null || params.nonce === undefined) {
		return `Missing params.nonce`;
	}
	
	let quality = parseInt(params.quality);
	if (isNaN(quality) || quality < 1 || quality > 5) {
		return `The given '${params.quality}' params.quality should be a number between 1 and 5`;
	}

	return true;
}

let validateStakingSaloonScapePointsParams = function(params) {
	if (!params.nftId) {
		return `Missing params.nftId`;
	} else if (!params.scapePoints) {
		return `Missing params.scapePoints`;
	}
	
	let nftId = parseInt(params.nftId);
	if (isNaN(nftId) || nftId <= 0) {
		return `The given '${params.nftId}' params.nftId should be a number greater than 0`;
	}

	return true;
}

let validateStakingSaloonBonusParams = function(params) {
	if (!params.bonus) {
		return `Missing params.bonus`;
	} else if (!params.nftId1) {
		return `Missing params.nftId1`;
	} else if (!params.nftId2) {
		return `Missing params.nftId2`;
	} else if (!params.nftId3) {
		return `Missing params.nftId3`;
	}

	let bonus = parseInt(params.bonus);
	let nftId1 = parseInt(params.nftId1);
	let nftId2 = parseInt(params.nftId2);
	let nftId3 = parseInt(params.nftId3);

	if (isNaN(bonus)) {
		return `The given '${params.bonus}' params.bonus should be a number`;
	}

	if (isNaN(nftId1) || nftId1 <= 0) {
		return `The given '${params.nftId1}' params.nftId1 should be a number greater than 0`;
	}
	
	if (isNaN(nftId2) || nftId2 <= 0) {
		return `The given '${params.nftId2}' params.nftId2 should be a number greater than 0`;
	}

	if (isNaN(nftId3) || nftId3 <= 0) {
		return `The given '${params.nftId3}' params.nftId3 should be a number greater than 0`;
	}
	
	return true;
}

let validateScapeForumQualityParams = function(params) {
	if (!params.nftId1) {
		return `Missing params.nftId1`;
	} else if (!params.nftId2) {
		return `Missing params.nftId2`;
	} else if (!params.nftId3) {
		return `Missing params.nftId3`;
	} else if (!params.nftId4) {
		return `Missing params.nftId4`;
	} else if (!params.nftId5) {
		return `Missig params.nftId5`;
	} else if (!params.imgId) {
		return `Missing params.imgId`;
	} else if (!params.quality) {
		return `Missig params.quality`;
	} else if (!params.stakedInt) {
		return `Missing params.stakedInt`;
	}

	let nftId1 = parseInt(params.nftId1);
	let nftId2 = parseInt(params.nftId2);
	let nftId3 = parseInt(params.nftId3);
	let nftId4 = parseInt(params.nftId4);
	let nftId5 = parseInt(params.nftId5);
	let quality = parseInt(params.quality);
	let imgId = parseInt(params.imgId);

	if (isNaN(imgId) || imgId <= 0) {
		return `The given '${params.imgId}' params.imgId should be a number greater than 0`;
	}

	if (isNaN(quality) || quality < 1 || quality > 5) {
		return `The given '${params.quality}' params.quality should be a number between 1 and 5`;
	}

	if (isNaN(nftId1) || nftId1 <= 0) {
		return `The given '${params.nftId1}' params.nftId1 should be a number greater than 0`;
	}
	
	if (isNaN(nftId2) || nftId2 <= 0) {
		return `The given '${params.nftId2}' params.nftId2 should be a number greater than 0`;
	}

	if (isNaN(nftId3) || nftId3 <= 0) {
		return `The given '${params.nftId3}' params.nftId3 should be a number greater than 0`;
	}
	
	if (isNaN(nftId4) || nftId4 <= 0) {
		return `The given '${params.nftId4}' params.nftId4 should be a number greater than 0`;
	}

	if (isNaN(nftId5) || nftId5 <= 0) {
		return `The given '${params.nftId5}' params.nftId5 should be a number greater than 0`;
	}

	return true;
}

//////////////////////////////////////////////////////////////////////////////////////////////
//
// Signature
//
//////////////////////////////////////////////////////////////////////////////////////////////


/**
 * NFT Brawl: We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	quality 		(integer)
 * 	owner 			(address)
 * 	amountWei		(integer in wei)
 * 	mintedTime		(integer)
 */
let getNftBrawlQualitySignature = async function (params, wallet) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let quality 	= parseInt(params.quality);
	let owner 		= params.owner;
	let amountWei 	= params.amountWei;								// Could be converted to BigNumber too.
	let mintedTime 	= parseInt(params.mintedTime.toString());
	let nonce 		= parseInt(params.nonce.toString());

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [amountWei, mintedTime]);
	let nonceBytes32 = ethers.utils.defaultAbiCoder.encode(["uint256"], [nonce]);

	let bytes1 = ethers.utils.hexZeroPad(ethers.utils.hexlify(quality), 1);
	let str = owner + bytes32.substr(2) + bytes1.substr(2) + nonceBytes32.substr(2);
	let data = ethers.utils.keccak256(str);

	let arr = ethers.utils.arrayify(data);

	try {
		return await wallet.sign(arr);
	} catch (e) {
		return "";
	}
};

/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	nftId 			(integer)
 * 	scapePoints		(integer)
 */
let getStakingSaloonScapePointsSignature = async function (params, wallet) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let nftId = parseInt(params.nftId);
	let scapePoints = parseInt(params.scapePoints);

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256"], [nftId, scapePoints]);
	let data = ethers.utils.keccak256(bytes32);

	let arr = ethers.utils.arrayify(data);

	try {
		return await wallet.sign(arr);
	} catch (e) {
		return "";
	}
};


/**
 * We suppose that all GET parameters are valid and always passed.
 * 
 * GET parameters:
 * 	bonus 			(integer)
 * 	nftId 			(integer)
 */
let getStakingSaloonBonusSignature = async function (params, wallet) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let bonus = parseInt(params.bonus);
	let nftId1 = parseInt(params.nftId1);
	let nftId2 = parseInt(params.nftId2);
	let nftId3 = parseInt(params.nftId3);

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = ethers.utils.defaultAbiCoder.encode(
		["uint256", "uint256", "uint256", "uint256"],
		[bonus, nftId1, nftId2, nftId3]);

	let data = ethers.utils.keccak256(bytes32);

	let arr = ethers.utils.arrayify(data);

	try {
		return await wallet.sign(arr);
	} catch (e) {
		return "";
	}
}

let getScapeForumQualitySignature = async function (params, wallet) {
	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let nftId1 = parseInt(params.nftId1);
	let nftId2 = parseInt(params.nftId2);
	let nftId3 = parseInt(params.nftId3);
	let nftId4 = parseInt(params.nftId4);
	let nftId5 = parseInt(params.nftId5);
	let quality = parseInt(params.quality);
	let imgId = parseInt(params.imgId);
	let stakedInt = params.stakedInt;        //remember to update accordingly or verification will fail
	let totalStaked = ethers.utils.parseEther(stakedInt.toString());

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------
	let bytes32 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "uint256", "uint256", "uint256", "uint256","uint256"], [nftId1, nftId2, nftId3, nftId4, nftId5, totalStaked,imgId]);

	let bytes1 = ethers.utils.hexZeroPad(ethers.utils.hexlify(quality), 1);
	let str = bytes32 + bytes1.substr(2);
	let data = ethers.utils.keccak256(str);

	let arr = ethers.utils.arrayify(data);

	try {
		return await wallet.sign(arr);
	} catch (e) {
		return "";
	}
};


module.exports.isSupportedType = function(signType) {
	return signTypes.indexOf(signType) > -1;
}

/**
 * Returns an error message, if param is invalid.
 * Otherwise returns true.
 * @param {SignType} signType 
 * @param {Object} params 
 */
module.exports.validateParams = function(signType, params) {
	if (signType === signTypes[0]) {
		return validateNftBrawlQualityParams(params);
	} else if (signType === signTypes[1]) {
		return validateStakingSaloonScapePointsParams(params);
	} else if (signType === signTypes[2]) {
		return validateStakingSaloonBonusParams(params);
	} else if (signType === signTypes[3]) {
		return validateScapeForumQualityParams(params);
	}

	return `Validation not defined for ${signType} signType`;
}


/**
 * Returns a signature otherwise undefind
 * @param {SignType} signType 
 * @param {Object} params 
 * @param {ethers.Wallet} wallet 
 */
module.exports.getSignature = async function(signType, params, wallet) {
	if (signType === signTypes[0]) {
		return await getNftBrawlQualitySignature(params, wallet);
	} else if (signType === signTypes[1]) {
		return await getStakingSaloonScapePointsSignature(params, wallet);
	} else if (signType === signTypes[2]) {
		return await getStakingSaloonBonusSignature(params, wallet);
	} else if (signType === signTypes[3]) {
		return await getScapeForumQualitySignature(params, wallet);
	}

	// returns undefined by JS as expected by function design.
}