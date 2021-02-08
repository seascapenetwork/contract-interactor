let express = require('express');
let blockchain = require('./blockchain');
let profitCircus = require('./profit_circus');
let fs = require('fs');
const app = express()
const port = 3000;

// add account from privatekey to web3 to sign contracts
if (process.env.ACCOUNT_1 == undefined) {
    throw "No ACCOUNT_1 environment variable found. Can not connect to blockchain";
}
let nftRushOwner = blockchain.web3.eth.accounts.privateKeyToAccount(process.env.ACCOUNT_1);
blockchain.web3.eth.accounts.wallet.add(nftRushOwner);

var networkId = null;         // set during express listening

// address and abi of second game: nft rush
var artifact = JSON.parse(fs.readFileSync('./abi/NftRush.json', 'utf8'));
var nftRushAddress = null;    // set during express listening
var nftRush = null;           // set during express listening

// address and abi of the Crowns (CWS) erc-20 token
var crownsArtifact = JSON.parse(fs.readFileSync('./abi/CrownsToken.json', 'utf8'));
var crownsAddress = null;     // set during express listening
var crowns;                   // set during express listening


app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/profit-circus', async function (req, res) {
    let ethString = req.query.ethPrice;
    if (ethString == undefined) {
	res.send(JSON.stringify({status: "error", message: "no ethPrice parameter"}));
	return;
    }
    let ethPrice = parseFloat(ethString);
    if (isNaN(ethPrice)) {
	res.send(JSON.stringify({status: "error", message: "invalid ethPrice parameter"}));
	return;
    }
    
    let result = await profitCircus.fetchPairNecessaryData(ethPrice, networkId, crownsAddress);
    if (result.error != undefined) {
	result.status = "ok";
    }
    res.send(JSON.stringify(result));
});

// send a winner set transaction
app.post('/set-leaderboard', async function (req, res) {
    if (req.body == undefined) {
	res.send('{"status": "error", "message":"no json body"}');
	return
    }

    const gasPrice = await blockchain.web3.eth.getGasPrice();

    let approvement = await approveCrowns();
    if (approvement == false) {
	res.send('{"status": "error", "message":"no cws were approved to nft rush"}');
	return;
    }
    
    if (req.body.type == "daily") {	
	var gasEstimate = null;

	/*announceDailyWinners(uint256 _sessionId,
			 address[10] memory _spentWinners,				  
				  uint8 _spentWinnersAmount,
			 address[10] memory _mintedWinners,				  
				  uint8 _mintedWinnersAmount*/
	
	try {
	    gasEstimate = await nftRush.methods.announceDailyWinners(
		req.body.session_id,
		req.body.spent_wallets,		
		req.body.spent_amount,		
		req.body.minted_wallets,		
		req.body.minted_amount)
	  .estimateGas({ from: nftRushOwner.address }); 
	} catch (e) {
	    console.error(e);	    
	    res.send('{"status": "error", "message":"error during daily spent gas estimation"}');
	    return;
	}
	
	var result = null;

	try{
	    result = await nftRush.methods	
		.announceDailyWinners(
		    req.body.session_id,
		    req.body.spent_wallets,		    
		    req.body.spent_amount,		    
		    req.body.minted_wallets,		    
		    req.body.minted_amount)
		.send({
		    from: nftRushOwner.address,
		    gasPrice: gasPrice,
		    gas: gasEstimate * 3
		});	    
	} catch (e) {
	    console.error(e);	    
	    res.send('{"status": "error", "message":"failed to announce daily spent winners"}');
	    return;
	}

	console.log("Daily leaderboard winners were announnced! Txid: ", result.transactionHash);	
    } else if (req.body.type == "all-time") {
	var gasEstimate = null;
	
	try {
	    gasEstimate = await nftRush.methods.announceAllTimeWinners(
		req.body.session_id,		
		req.body.spent_wallets,		
		req.body.spent_amount,		
		req.body.minted_wallets,		
		req.body.minted_amount)
		.estimateGas({ from: nftRushOwner.address });	    
	} catch (e) {
	    console.error(e);
	    res.send('{"status": "error", "message":"failed to gas estimate for daily minted winners"}');	    
	    return;
	}

	var result = null;
	try {
	    result = await nftRush.methods	
		.announceAllTimeWinners(
		    req.body.session_id,		    
		    req.body.spent_wallets,		    
		    req.body.spent_amount,		    
		    req.body.minted_wallets,		    
		    req.body.minted_amount)	
		.send({
		    from: nftRushOwner.address,
		    gasPrice: gasPrice,
		    gas: gasEstimate * 3
		});
	} catch (e) {
	    console.error(e);
	    res.send('{"status": "error", "message":"failed to announce daily minted winners"}');
	    return;
	}

	console.log("Alltime leaderboard winners were announced! Txid: ", result.transactionHash);	
    }

    res.send('{"status": "ok"}'); 
})

app.listen(port, async function(){
    networkId = await blockchain.web3.eth.net.getId();
    if (artifact.networks[networkId] !== undefined) {
	nftRushAddress = artifact.networks[networkId].address;	
	nftRush = await blockchain.loadContract(blockchain.web3,
						nftRushAddress, artifact.abi);	
    }
	
    crownsAddress = crownsArtifact.networks[networkId].address;
    crowns = await blockchain.loadContract(blockchain.web3, crownsAddress, crownsArtifact.abi);

    console.log(`Contract interactor at port ${port}`);
})


let calculateTotalPrize = function() {
    prizes = JSON.parse(process.env.NFT_RUSH_PRIZES);
    
    let total = 0;
    for(var i=1; i<=prizes.length; i++) {
	total += prizes[i];
    }

    return total;
};


let approveCrowns = async function(gasPrice) {
    // for now all type of leaderboard reward players with the same amount of
    // CWS tokens.
    // in the next versions, approving CWS tokens should be in the leaderboard blocks
    var totalPrize = blockchain.web3.utils.toWei(calculateTotalPrize().toString());

    var approveGasEstimate = null;
    
    try {
     approveGasEstimate = await crowns.methods
	  .approve(nftRushAddress, totalPrize)    
	  .estimateGas({ from: nftRushOwner.address });    
    } catch (e) {
	console.error(e);
	return false;
    }

    try {
      await crowns.methods
	.approve(nftRushAddress, totalPrize)
	.send({from: nftRushOwner.address, gasPrice: gasPrice, gas: approveGasEstimate * 3});
    } catch (e) {
	console.error(e);
	return false;
    }

    return true;
};
