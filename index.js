const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { exit } = require("process");

const [url, file] = process.argv.slice(2);

let boardTitle = "";
if (!url) {
  throw "Please provide a URL as the first argument.";
}

const innerText = (node) => node.innerText.trim();
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector(".easy-card-list");

  boardTitle = await page.$eval(".board-name", innerText);

  if (!boardTitle) {
    throw "Board title does not exist. Please check if provided URL is correct.";
  }

  let parsedText = "";

  const columns = await page.$$(".easy-card-list");

  for (let c = 0; c < columns.length; c++) {
    const columnTitle = await columns[c].$eval(".column-header", innerText);

    const messages = await columns[c].$$(".easy-board-front");
    if (messages.length) {
      parsedText += columnTitle + "\n";
    }
    for (let m = 0; m < messages.length; m++) {
      const messageText = await messages[m].$eval(
        ".easy-card-main .easy-card-main-content .text",
        innerText
      );
      const votes = await messages[m].$eval(
        ".easy-card-votes-container .easy-badge-votes",
        innerText
      );
      parsedText += `- ${messageText} (${votes})` + "\n";
    }

    if (messages.length) {
      parsedText += "\n";
    }
  }

  return parsedText;
}

function writeToFile(filePath, data) {
  const resolvedPath = path.resolve(
    filePath || `../${boardTitle.replace(/\s/g, "")}.csv`
  );
  fs.writeFile(resolvedPath, data, (error) => {
    if (error) {
      throw error;
    } else {
      console.log(`Successfully written to file at: ${resolvedPath}`);
    }
    process.exit();
  });
}

function handleError(error) {
  console.error(error);
}

run()
  .then((data) => writeToFile(file, data))
  .catch(handleError);
