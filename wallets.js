#!/usr/bin / env node

const clear = require("clear");
const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const clui = require('clui');
const fs = require("fs");
const Spinner = clui.Spinner;
const { ethers } = require("ethers");

let defaultConsole = chalk.keyword('orange');

const getWalletPath = (file) => {
    return `./private/${file}.json`;
};

const askNftBrawl = () => {
    const questions = [
        {
            name: "NFT_BRAWL_WALLET",
            type: "input",
            message: "What is the NFT Brawl Signer wallet name in `private` folder without extension?"
        },
        {
            name: "NFT_BRAWL_PASSPHRASE",
            type: "password",
            message: "What is the NFT Brawl Signer passphrase?"
        }
    ];
    return inquirer.prompt(questions);
};

/**
 * Returns Scape NFT scape points used in Staking Saloon.
 * @returns Inquirer
 */
const askScapePoints = () => {
    const questions = [
        {
            name: "SCAPE_POINTS_WALLET",
            type: "input",
            message: "What is the Scape Points Signer wallet name in `private` folder without extension (Used in Staking Saloon)?"
        },
        {
            name: "SCAPE_POINTS_PASSPHRASE",
            type: "password",
            message: "What is the Scape Points Signer passphrase?"
        }
    ];
    return inquirer.prompt(questions);
};

/**
 * Staking Saloon Bonus.
 * @returns Inquirer
 */
const askStakingBonus = () => {
    const questions = [
        {
            name: "STAKING_BONUS_WALLET",
            type: "input",
            message: "What is the Staking Bonus Signer wallet name in `private` folder without extension (Used in Staking Saloon)?"
        },
        {
            name: "STAKING_BONUS_PASSPHRASE",
            type: "password",
            message: "What is the Staking Bonus Signer passphrase?"
        }
    ];
    return inquirer.prompt(questions);
};

/**
 * Staking Saloon Bonus.
 * @returns Inquirer
 */
const askForumQuality = () => {
    const questions = [
        {
            name: "FORUM_QUALITY_WALLET",
            type: "input",
            message: "What is the Forum Quality Signer wallet name in `private` folder without extension (Used in Scape Forum)?"
        },
        {
            name: "FORUM_QUALITY_PASSPHRASE",
            type: "password",
            message: "What is the Forum Quality Signer passphrase?"
        }
    ];
    return inquirer.prompt(questions);
};

/**
 * Read nft brawl file.
 * @param {string} path 
 * @returns string of json
 * @warning exits on error.
 */
const readWallet = (file) => {
    let path = getWalletPath(file);

    return new Promise((resolve, _reject) => {
        fs.readFile(path, (error, data) => {
            if (error) {
                console.log(chalk.red(error));
                process.exit(1);
            } else {
                resolve(data);
            }
        });
    })
}

/**
 * Decrypt the Keystore wallet with the given password. If failed to decrypt, then return undefined.
 * @param {string} json 
 * @param {string} password 
 * @param {clui.Spinner} spinner 
 * @returns ethers.Wallet
 * @warning exits on error.
 */
const decryptWallet = async (json, password, spinner) => {
    spinner.start();

    let wallet;
    try {
        wallet = await ethers.Wallet.fromEncryptedJson(json, password);
    } catch (error) {
        spinner.stop();

        console.log(chalk.red(error));
        process.exit(2);
    }

    spinner.stop();
    return wallet;
};

/**
 * @returns array of all wallets
 */
const initWallets = async () => {
    // nft brawl
    const { NFT_BRAWL_WALLET, NFT_BRAWL_PASSPHRASE } = await askNftBrawl();

    let nftBrawlDecryptSpinner = new Spinner(`Decrypting NFT Brawl wallet...`);
    let nftBrawlJson = await readWallet(NFT_BRAWL_WALLET);
    let nftBrawlWallet = await decryptWallet(nftBrawlJson, NFT_BRAWL_PASSPHRASE, nftBrawlDecryptSpinner);

    console.log(chalk.blue.bold(`\nNft Brawl Wallet loaded successfully as ${nftBrawlWallet.address}\n`));

    // scape nft's scape points (used in staking saloon game)
    const { SCAPE_POINTS_WALLET, SCAPE_POINTS_PASSPHRASE } = await askScapePoints();

    let scapePointsDecryptSpinner = new Spinner(`Decrypting NFT Brawl wallet...`);
    let scapePointsJson = await readWallet(SCAPE_POINTS_WALLET);
    let scapePointsWallet = await decryptWallet(scapePointsJson, SCAPE_POINTS_PASSPHRASE, scapePointsDecryptSpinner);

    console.log(chalk.blue.bold(`\nScape Points (for Staking Saloon) Wallet loaded successfully as ${scapePointsWallet.address}\n`));

    // staking bonus (used in staking saloon game)
    const { STAKING_BONUS_WALLET, STAKING_BONUS_PASSPHRASE } = await askStakingBonus();

    let stakingBonusDecryptSpinner = new Spinner(`Decrypting Staking Bonus wallet...`);
    let stakingBonusJson = await readWallet(STAKING_BONUS_WALLET);
    let stakingBonusWallet = await decryptWallet(stakingBonusJson, STAKING_BONUS_PASSPHRASE, stakingBonusDecryptSpinner);

    console.log(chalk.blue.bold(`\nStaking Bonus Wallet (for Staking Saloon) loaded successfully as ${stakingBonusWallet.address}\n`));

    // forum quality (used in scape forum game)
    const { FORUM_QUALITY_WALLET, FORUM_QUALITY_PASSPHRASE } = await askForumQuality();

    let forumQualityDecryptSpinner = new Spinner(`Decrypting Forum Quality wallet...`);
    let forumQualityJson = await readWallet(FORUM_QUALITY_WALLET);
    let forumQualityWallet = await decryptWallet(forumQualityJson, FORUM_QUALITY_PASSPHRASE, forumQualityDecryptSpinner);

    console.log(chalk.blue.bold(`\nForum Quality (for Scape Forum) Wallet loaded successfully as ${forumQualityWallet.address}\n`));

    return {nftBrawlWallet, scapePointsWallet, stakingBonusWallet, forumQualityWallet};
};

const init = () => {
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
            // "\n\nIt requires the Rabbit MQ on defined network..."
        )
    );
  }
  
  const run = async () => {
    // show script introduction
    init();
  
    let { nftBrawlWallet, scapePointsWallet, stakingBonusWallet, forumQualityWallet } = await initWallets();
  };
  
  run();