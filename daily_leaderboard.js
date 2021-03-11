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
module.exports.setDailyLeaderboard = async function(nftRush, data, nftRushOwner) {
	//sessionId, spentWallets, spentAmount, mintedWallets, mintedAmount)
	const gasPrice = await blockchain.web3.eth.getGasPrice();
	var gasEstimate = await nftRush.methods.announceDailyWinners(data.session_id, data.spent_wallets, data.spent_amount, data.minted_wallets, data.minted_amount).estimateGas({ from: nftRushOwner.address }); 

	let params = {
		from: nftRushOwner.address,
		gasPrice: gasPrice,
		gas: gasEstimate * 3
	};
	var result = await nftRush.methods.announceDailyWinners(data.session_id, data.spent_wallets, data.spent_amount, data.minted_wallets, data.minted_amount).send(params);
	
	return 	result.transactionHash;
};

module.exports.claimSpents = async function(nftRush, account) {
	//sessionId, spentWallets, spentAmount, mintedWallets, mintedAmount)
	const gasPrice = await blockchain.web3.eth.getGasPrice();
	var gasEstimate = await nftRush.methods.claimDailySpent().estimateGas({ from: account.address }); 

	let params = {
		from: account.address,
		gasPrice: gasPrice,
		gas: gasEstimate * 3
	};
	var result = await nftRush.methods.claimDailySpent().send(params);

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

let setDaysAnnounced = async function(sessionId) {
	let sql = `UPDATE nft_rush_sessions SET all_days_announced = true WHERE id = '${sessionId}' `;
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

module.exports.calculateDailyWinners = async function() {
    session = await getLastSession();
    
	// after session expiration, we can define announcement only for one time.
    if (!session.all_days_announced) {
      	let spent = await getSpentWinners(session)      
      	let minted = await getMintedWinners(session)
		  
      	if (!isActiveSession(session)) { 
		  	await setDaysAnnounced(session.id);
		}

      	return {
			"session_id": session.id,	    
			"spent_amount": spent.amount,	    
			"spent_wallets": spent.wallets,	    
			"minted_amount": minted.amount,	    
			"minted_wallets": minted.wallets	    
		};      
	}
};

let getYesterday = function() {
	let beginDate = new Date(); 
	beginDate.setHours(0,0,0,0);
	beginDate.setDate(beginDate.getDate() - 1);
	return beginDate;
};

let getToday = function () {
	let beginDate = new Date(); 
	beginDate.setHours(0,0,0,0);
	return beginDate;
}

let getSpentWinners = async function(session) {
	let beginDate = getYesterday();
	let endDate = getYesterday();
    endDate = new Date(endDate.setDate(endDate.getDate() + 1));

	let leaderboard = await getSpentDay(session.id, beginDate, endDate)

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
	let beginDate = getYesterday();
	let endDate = getYesterday();
    endDate = new Date(endDate.setDate(endDate.getDate() + 1));

	let leaderboard = await getMintedDay(session.id, beginDate, endDate)

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

let getSpentDay = async function(sessionId, beginDate, endDate) {
	let sql = `SELECT wallet_address, MAX(amount) as amounts FROM spent_leaderboards WHERE date_time >= '${beginDate.toMysqlFormat()}' AND date_time <= '${endDate.toMysqlFormat()}' AND\
	session_id = '${sessionId}' GROUP BY wallet_address ORDER BY MAX(amount) DESC LIMIT 10 `;

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

let getMintedDay = async function(sessionId, beginDate, endDate) {
	let sql = `SELECT wallet_address, COUNT(nft_id) as amounts FROM minted_leaderboards WHERE date_time >= '${beginDate.toMysqlFormat()}' AND date_time <= '${endDate.toMysqlFormat()}' AND\
	session_id = '${sessionId}' GROUP BY wallet_address ORDER BY COUNT(nft_id) DESC LIMIT 10 `;

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
