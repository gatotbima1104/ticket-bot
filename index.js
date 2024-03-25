import puppeteer from "puppeteer-extra";
import PluginStealth from "puppeteer-extra-plugin-stealth";
import { Telegraf } from "telegraf";
import { setTimeout } from "node:timers/promises";
import * as dotenv from "dotenv";

// pull env
dotenv.config();
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// assign with telegram
const bot = new Telegraf(BOT_TOKEN);

// use puppeteer plugin stealth
puppeteer.use(PluginStealth());

async function checkPage(URL, retryCount = 0) {
  // chekcing condition
  if (retryCount >= 5) {
    await bot.telegram.sendMessage(CHAT_ID, "Maximum retries filled");
    console.log("Max retries filled");
    return;
  }

  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  await page.goto(URL);
  await setTimeout(1000);

  //   Click the cookie consent button, if it appears
  const consentButton = await page.$("#cookieConsentAgree");
  if (consentButton) {
    await consentButton.click();
  }
  console.log("cookie allowed");

  // Find and click the button by ID
  const buttonSelector = "div.event-card__button>a";
  if ((await page.$(buttonSelector)) !== null) {
    await page.click(buttonSelector);
    console.log("button buy clicked");

    await setTimeout(2000);

    // Check for the banner indicating sold out
    // const isSoldOut = (await page.$("#banner-alert-sold-out")) !== null;
    const isSoldOut = (await page.$("p.notification__text")) !== null;
    const urlTicket = page.url();

    if (isSoldOut) {
      console.log(`Sold out. Retrying (attempt ${retryCount + 1})...`);
      // await bot.telegram.sendMessage(
      //   CHAT_ID,
      //   `Sold out. Retrying (attempt ${retryCount + 1}) ${urlTicket}...`
      // );
      await browser.close();

      // Retry after a random delay
      // await setTimeout(5000); // 5 seconds
      await setTimeout(Math.random() * (120000 - 30000) + 30000); // 30 to 120 seconds randomly

      // run for retrying program
      await checkPage(URL, retryCount + 1);
    } else {
      // If the ticket selection page opens, send alert to Telegram
      await bot.telegram.sendMessage(
        CHAT_ID,
        `Tickerts are available ${urlTicket}`
      );
      console.log("ticket are available!");
      await browser.close();
    }
  } else {
    console.log("Button not found");
    await browser.close();
  }
}
// Check if URL argument is provided
if (process.argv.length < 3) {
  console.error("Please provide the URL as a command-line argument.");
  process.exit(1);
}
// Get the URL from command-line arguments
const URL = process.argv[2];
checkPage(URL).catch(console.error);

// https://www.ticket-onlineshop.com/ols/hcfg/fr/meisterschaft/channel/shop/index/index/event/497938
