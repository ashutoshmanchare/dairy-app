const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "../dist");
const apiUrl = process.env.API_URL || "";

function replaceInFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInFiles(filePath);
    } else if (filePath.endsWith(".js") || filePath.endsWith(".html") || filePath.endsWith(".txt")) {
      let content = fs.readFileSync(filePath, "utf8");
      if (content.includes("PROD_API_URL_PLACEHOLDER")) {
        content = content.replace(/PROD_API_URL_PLACEHOLDER/g, apiUrl);
        fs.writeFileSync(filePath, content, "utf8");
        console.log(`Successfully injected production API URL into built file: ${filePath}`);
      }
    }
  }
}

console.log("Searching for build files to inject API URL...");
replaceInFiles(distDir);
