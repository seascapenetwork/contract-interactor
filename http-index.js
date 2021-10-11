/**
 *  Now, you can send the messages to sign to the http://localhost:1000/
 */

const chalk 		= require("chalk");
const clear         = require("clear");
let defaultConsole  = chalk.keyword('orange');
const figlet        = require("figlet");

const { initWallets } = require('./wallets');
const sign            = require('./sign');

// or server to listen to sign up
const express = require('express');
const app = express()
const port = 3000;

/**
 * @description Print the Greetings to the Seascape Signer
 */
 const init = async () => {
    clear();

    console.log(
      chalk.yellow(
        figlet.textSync("Seascape Signer", {
          font: "Standard",
          horizontalLayout: "default",
          verticalLayout: "default"
        })
      )
    );

    console.log(
        defaultConsole(
            "\n\nIt accepts the HTTP request on defined network!"
        )
    );
};

let nftBrawlWallet;
let scapePointsWallet;
let stakingBonusWallet; 
let forumQualityWallet;

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
	let signature = "";
	let signType = "nft-brawl-quality";

	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let paramError = sign.validateParams(signType, content.params);
    if (paramError) {
        console.error(chalk.red(paramError));
        res.send(signature);
		return;
	}

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------

	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await sign.getSignature(signType, req.query, nftBrawlWallet);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: " + signature);

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
	let signature = "";
	let signType = "staking-saloon-scape-points";

	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let paramError = sign.validateParams(signType, content.params);
    if (paramError) {
        console.error(chalk.red(paramError));
        res.send(signature);
		return;
	}

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------

	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await sign.getSignature(signType, req.query, scapePointsWallet);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: " + signature);

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
	let signature = "";
	let signType = "staking-saloon-bonus";

	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let paramError = sign.validateParams(signType, content.params);
    if (paramError) {
        console.error(chalk.red(paramError));
        res.send(signature);
		return;
	}

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------

	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await sign.getSignature(signType, req.query, stakingBonusWallet);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: " + signature);

	res.send(signature);
})


app.get('/sign-scape-forum-quality', async function (req, res) {
	let signature = "";
	let signType = "scape-forum-quality";

	// ----------------------------------------------------------------
	// incoming parameters
	// ----------------------------------------------------------------
	let paramError = sign.validateParams(signType, content.params);
    if (paramError) {
        console.error(chalk.red(paramError));
        res.send(signature);
		return;
	}

	// ------------------------------------------------------------------
	// merging parameters into one message
	// ------------------------------------------------------------------

	try {
		// Signature could be signed in other method:
		// https://gist.github.com/belukov/3bf74d8e99fb5b8ad697e881fca31929
		signature = await sign.getSignature(signType, req.query, forumQualityWallet);
	} catch (e) {
		signature = "";
	}

	console.log("Signature: " + signature);

	res.send(signature);
})

app.listen(port, async () => {
	init();

	// import wallets for certain Network IDs.
    // Its in interactive mode, so requires user to type the passphrase to decrypt the wallets.
	let wallets = await initWallets(process.env.NETWORK_ID);
	nftBrawlWallet = wallets.nftBrawlWallet;
	scapePointsWallet = wallets.scapePointsWallet;
	stakingBonusWallet = wallets.stakingBonusWallet;
	forumQualityWallet = wallets.forumQualityWallet;

	console.log(chalk.green(`\n\nSeascape Signer runs on https://localhost:${port}!`));
});