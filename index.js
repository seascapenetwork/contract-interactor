let express = require('express');
let blockchain = require('./blockchain');
let fs = require('fs');
const app = express()
const port = 3000;

// add account from privatekey to web3 to sign contracts
if (process.env.ACCOUNT_1 == undefined) {
    throw "No ACCOUNT_1 environment variable found. Can not connect to blockchain";
}
let nftRushOwner = blockchain.web3.eth.accounts.privateKeyToAccount(process.env.ACCOUNT_1);
blockchain.web3.eth.accounts.wallet.add(nftRushOwner);

// address and abi of second game: nft rush
var artifact = JSON.parse(fs.readFileSync('./abi/NftRush.json', 'utf8'));
var networkId = null;         // set during express listening
var nftRushAddress = null;    // set during express listening
var nftRush = null;           // set during express listening

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// send a winner set transaction
app.post('/set-leaderboard', async function (req, res) {
    if (req.body == undefined) {
	res.send('{"status": "error", "message":"no json body"}');
	return
    }

    const gasPrice = await blockchain.web3.eth.getGasPrice();

    if (res.body.type == "daily-spent") {
	var gasEstimate = await nftRush.methods.addDailySpentWinners(req.body.session_id,
								       
								   req.body.wallets,
								   req.body.amount)
	  .estimateGas({ from: nftRushOwner.address });    

	var result = await nftRush.methods	
	    .addDailySpentWinners(req.body.session_id, req.body.wallets, req.body.amount)	
	    .send({from: nftRushOwner.address, gasPrice: gasPrice, gas: gasEstimate * 3});	

	console.log(result);	
    } else if (res.body.type == "daily-minted") {
	const gasEstimate = await nftRush.methods.addDailyMintedWinners(req.body.session_id,
								   req.body.wallets,
								   req.body.amount)
	      .estimateGas({ from: nftRushOwner.address });	

	let result = await nftRush.methods	
	    .addDailyMintedWinners(req.body.session_id, req.body.wallets, req.body.amount)	
	    .send({from: nftRushOwner.address, gasPrice: gasPrice, gas: gasEstimate * 3});	

	console.log(result);	
    }
    
    res.send('{"status": "ok"}'); 
})

app.listen(port, async function(){
    networkId = await blockchain.web3.eth.net.getId();
    nftRushAddress = artifact.networks[networkId].address;
    nftRush = await blockchain.loadContract(blockchain.web3, nftRushAddress, artifact.abi);

    console.log(`Contract interactor at port ${port}`);
})
