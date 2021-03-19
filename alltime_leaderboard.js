let blockchain = require('./blockchain');	 // to setup connection to a RPC Node
let db = require('./db');
let con;
let getCon = async function() {
	if (!con) {
		con = await db.getConnection();
	}
	
	return con;
}

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

// daily leaderboard on blockchain
module.exports.setAllTimeLeaderboard = async function(nftRush, data, nftRushOwner) {
	//sessionId, spentWallets, spentAmount, mintedWallets, mintedAmount)
	const gasPrice = await blockchain.web3.eth.getGasPrice();
	var gasEstimate = await nftRush.methods.announceAllTimeWinners(data.session_id, data.spent_wallets, data.spent_amount, data.minted_wallets, data.minted_amount).estimateGas({ from: nftRushOwner.address }); 

	let params = {
		from: nftRushOwner.address,
		gasPrice: gasPrice,
		gas: gasEstimate * 3
	};
	var result = await nftRush.methods.announceAllTimeWinners(data.session_id, data.spent_wallets, data.spent_amount, data.minted_wallets, data.minted_amount).send(params);
	
	return 	result.transactionHash;
};

module.exports.claimSpents = async function(nftRush, account) {
	//sessionId, spentWallets, spentAmount, mintedWallets, mintedAmount)
	const gasPrice = await blockchain.web3.eth.getGasPrice();
	var gasEstimate = await nftRush.methods.claimAllTimeSpent().estimateGas({ from: account.address }); 

	let params = {
		from: account.address,
		gasPrice: gasPrice,
		gas: gasEstimate * 3
	};
	var result = await nftRush.methods.claimAllTimeSpent().send(params);

	return 	result.transactionHash;
};

//////////////////////////////////////////////////////////

let getLastSession = async function() {
	let sql = "SELECT * FROM nft_rush_sessions ORDER BY id DESC LIMIT 1";
	let con = await getCon();
	return await new Promise(function(resolve, reject) {
		con.query(sql, function(err, res, _fields) {
			if (err) {
				reject(err);
			} else {
				resolve(res[0]);
			}
		});
	});
};

let setAllTimeAnnounced = async function(sessionId) {
	let sql = `UPDATE nft_rush_sessions SET all_time_announced = true WHERE id = '${sessionId}' `;
	let con = await getCon();
	return await new Promise(function(resolve, reject) {
		con.query(sql, function(err, res, _fields) {
			if (err) {
				reject(err);
			} else {
				resolve(res[0]);
			}
		});
	});
};

module.exports.calculateAllTimeWinners = async function() {
    session = await getLastSession();
    
	// after session expiration, we can define announcement only for one time.
    if (!isActiveSession(session) && !session.all_time_announced) {
      	let spent = await getSpentWinners(session)      
      	let minted = await getMintedWinners(session)
		  
	  	await setAllTimeAnnounced(session.id);

      	return {
			"session_id": session.id,	    
			"spent_amount": spent.amount,	    
			"spent_wallets": spent.wallets,	    
			"minted_amount": minted.amount,	    
			"minted_wallets": minted.wallets	    
		};      
	}
};

let getSpentWinners = async function(session) {
	let leaderboard = await getSpentAllTime(session.id)

	let wallets = [];
	leaderboard.forEach(element => {
		wallets.push(element.wallet_address);
	});
	let amount = leaderboard.length;
	
	let placeholder = process.env.ADDRESS_1;

	for (var i=amount; i<10; i++) {
		wallets[i] = placeholder;
	}

	return {wallets: wallets, amount: leaderboard.length};
}

let getMintedWinners = async function(session) {    
	let leaderboard = await getMintedAllTime(session.id)

	let wallets = [];
	leaderboard.forEach(element => {
		wallets.push(element.wallet_address);
	});
	let amount = leaderboard.length;
	
	let placeholder = process.env.ADDRESS_1;

	for (var i=amount; i<10; i++) {
		wallets[i] = placeholder;
	}

	return {wallets: wallets, amount: leaderboard.length};
}

let isActiveSession = async function(session) {
    if (!session) {
		return false;
	}

	let today = new Date();

	return session.end_time.getTime() <= today.getTime();
};

let getSpentAllTime = async function(sessionId) {
	let sql = `SELECT wallet_address, SUM(amount) as amounts FROM spent_leaderboards WHERE session_id = '${sessionId}' GROUP BY wallet_address ORDER BY SUM(amount) DESC LIMIT 10 `;

	let con = await getCon();

	return await new Promise(function(resolve, reject) {
		con.query(sql, function(err, res, _fields) {
			if (err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
};

let getMintedAllTime = async function(sessionId) {
	let sql = `SELECT wallet_address, COUNT(nft_id) as amounts FROM minted_leaderboards WHERE session_id = '${sessionId}' GROUP BY wallet_address ORDER BY COUNT(nft_id) DESC LIMIT 10 `;

	let con = await getCon();
	return await new Promise(function(resolve, reject) {
		con.query(sql, function(err, res, _fields) {
			if (err) {
				reject(err);
			} else {
				resolve(res);
			}
		});
	});
};
