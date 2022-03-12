const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { exit } = require("process");

const [url, file] = process.argv.slice(2);
// Hoisted boardTitle so it can be used for filename
let boardTitle = "";

if (!url) {
  throw "Please provide a URL as the first argument.";
}

// Helps retrieve innerText from selected HTML element with .$eval
const innerText = (node) => node.innerText.trim();
// Main function for parsing and reformatting the data
async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await page.waitForSelector(".easy-card-list");

  boardTitle = await page.$eval(".board-name", innerText);

  if (!boardTitle) {
    throw "Board title does not exist. Please check if provided URL is correct.";
  }
  //   Final returned text variable
  let parsedText = "";
  // temp object setup for reference to notes for each column from previous board
  let temp = {};

  const columns = await page.$$(".easy-card-list");

  for (let c = 0; c < columns.length; c++) {
    const columnTitle = await columns[c].$eval(".column-header", innerText);
    temp[columnTitle] = [];

    const messages = await columns[c].$$(".easy-board-front");
    parsedText +=
      c < columns.length - 1 ? columnTitle + "," : columnTitle + "\n";
    for (let m = 0; m < messages.length; m++) {
      const messageText = await messages[m].$eval(
        ".easy-card-main .easy-card-main-content .text",
        innerText
      );
      const votes = await messages[m].$eval(
        ".easy-card-votes-container .easy-badge-votes",
        innerText
      );
      parseInt(votes) > 0 ? temp[columnTitle].push(`${messageText}`) : null;
    }
  }
  //   Reference array established from reference object setup earlier
  const states = Object.keys(temp);
  //   Used to track longest column length so it can format the notes properly in the output file
  let mostNotes = 0;
  //   used to set the max length of one column's notes
  for (const key in temp) {
    if (temp[key].length > mostNotes) {
      mostNotes = temp[key].length;
    }
  }
  //   outside loop for adding that row of notes to each column
  for (let n = 0; n < mostNotes; n++) {
    //   inside loop for looping through each column and adding the first note to each column
    for (let k = 0; k < states.length; k++) {
      // checks to see if a note exists at that index in the array for that object key ( references temp object)
      if (temp[states[k]][n]) {
        //   denotes when to format a new line
        if (k === states.length - 1) {
          parsedText += `${temp[states[k]][n]}\n`;
        }
        // only adds comma at end since it is not the end of the row
        else {
          parsedText += `${temp[states[k]][n]}, `;
        }
      }
      //   adds a blank space to denote no notes of >1 vote for this column exist
      else {
        parsedText += " ,";
      }
    }
  }

  return parsedText;
}
// added format argument to allow user to input their own file format if they want soemthing other than a csv output
function writeToFile(filePath, data, format = "csv") {
  const resolvedPath = path.resolve(
    filePath || `../${boardTitle.replace(/\s/g, "")}.${format}`
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
