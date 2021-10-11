#!/usr/bin/env node

const inquirer = require("inquirer");
const chalk = require("chalk");
const clui = require('clui');
const Spinner = clui.Spinner;
const walletUtil = require("./src/wallet-util");

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
 * @returns array of all wallets
 */
const initWallets = async () => {
    // nft brawl
    const { NFT_BRAWL_WALLET, NFT_BRAWL_PASSPHRASE } = await askNftBrawl();

    let nftBrawlDecryptSpinner = new Spinner(`Decrypting NFT Brawl wallet...`);
    let nftBrawlJson = await walletUtil.readWallet(NFT_BRAWL_WALLET);
    let nftBrawlWallet = await walletUtil.decryptWallet(nftBrawlJson, NFT_BRAWL_PASSPHRASE, nftBrawlDecryptSpinner);

    console.log(chalk.blue.bold(`\nNft Brawl Wallet loaded successfully as ${nftBrawlWallet.address}\n`));

    // scape nft's scape points (used in staking saloon game)
    const { SCAPE_POINTS_WALLET, SCAPE_POINTS_PASSPHRASE } = await askScapePoints();

    let scapePointsDecryptSpinner = new Spinner(`Decrypting NFT Brawl wallet...`);
    let scapePointsJson = await walletUtil.readWallet(SCAPE_POINTS_WALLET);
    let scapePointsWallet = await walletUtil.decryptWallet(scapePointsJson, SCAPE_POINTS_PASSPHRASE, scapePointsDecryptSpinner);

    console.log(chalk.blue.bold(`\nScape Points (for Staking Saloon) Wallet loaded successfully as ${scapePointsWallet.address}\n`));

    // staking bonus (used in staking saloon game)
    const { STAKING_BONUS_WALLET, STAKING_BONUS_PASSPHRASE } = await askStakingBonus();

    let stakingBonusDecryptSpinner = new Spinner(`Decrypting Staking Bonus wallet...`);
    let stakingBonusJson = await walletUtil.readWallet(STAKING_BONUS_WALLET);
    let stakingBonusWallet = await walletUtil.decryptWallet(stakingBonusJson, STAKING_BONUS_PASSPHRASE, stakingBonusDecryptSpinner);

    console.log(chalk.blue.bold(`\nStaking Bonus Wallet (for Staking Saloon) loaded successfully as ${stakingBonusWallet.address}\n`));

    // forum quality (used in scape forum game)
    const { FORUM_QUALITY_WALLET, FORUM_QUALITY_PASSPHRASE } = await askForumQuality();

    let forumQualityDecryptSpinner = new Spinner(`Decrypting Forum Quality wallet...`);
    let forumQualityJson = await walletUtil.readWallet(FORUM_QUALITY_WALLET);
    let forumQualityWallet = await walletUtil.decryptWallet(forumQualityJson, FORUM_QUALITY_PASSPHRASE, forumQualityDecryptSpinner);

    console.log(chalk.blue.bold(`\nForum Quality (for Scape Forum) Wallet loaded successfully as ${forumQualityWallet.address}\n`));

    return {nftBrawlWallet, scapePointsWallet, stakingBonusWallet, forumQualityWallet};
};

module.exports.initWallets = initWallets;