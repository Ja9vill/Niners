const fs = require('fs');
const path = require('path');

const prodCssPath = "E:\\nine-dashboard\\scratch\\temp_bundle\\assets\\index-7G3IQpoc.css";
const distDir = "C:\\Users\\Jwavp\\.gemini\\antigravity\\worktrees\\nine-dashboard\\reconstruct-vite-project-bundle\\dist\\assets";
let distCssPath = "";

try {
  const files = fs.readdirSync(distDir);
  const cssFile = files.find(f => f.startsWith("index-") && f.endsWith(".css"));
  if (cssFile) {
    distCssPath = path.join(distDir, cssFile);
  }
} catch (e) {
  console.error("Failed to read dist directory:", e);
}

if (!distCssPath) {
  console.error("Could not find generated CSS in dist/assets");
  process.exit(1);
}

const outLines = [];
outLines.push(`Comparing Production CSS:\n  ${prodCssPath}\nwith Workspace Built CSS:\n  ${distCssPath}\n`);

function extractRules(cssPath) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const rules = {};
  
  const cleanCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
  
  const customProps = [];
  const propRegex = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)/g;
  let match;
  while ((match = propRegex.exec(cleanCss)) !== null) {
    customProps.push({ name: match[1], value: match[2].trim() });
  }
  
  let currentSelector = "";
  let braceCount = 0;
  let blockStart = 0;
  
  for (let i = 0; i < cleanCss.length; i++) {
    const char = cleanCss[i];
    if (char === '{') {
      if (braceCount === 0) {
        currentSelector = cleanCss.substring(blockStart, i).trim();
        blockStart = i + 1;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        const body = cleanCss.substring(blockStart, i).trim();
        if (currentSelector) {
          rules[currentSelector] = body;
        }
        blockStart = i + 1;
      }
    }
  }
  
  return { rules, customProps };
}

const prodData = extractRules(prodCssPath);
const distData = extractRules(distCssPath);

outLines.push("=== CUSTOM PROPERTIES COMPARISON ===");
const prodPropsMap = new Map(prodData.customProps.map(p => [p.name, p.value]));
const distPropsMap = new Map(distData.customProps.map(p => [p.name, p.value]));

let propMismatches = 0;
for (const [name, val] of prodPropsMap.entries()) {
  if (!distPropsMap.has(name)) {
    outLines.push(`[-] Missing Property in Workspace: ${name} (Prod value: ${val})`);
    propMismatches++;
  } else if (distPropsMap.get(name) !== val) {
    outLines.push(`[!] Value Mismatch: ${name}\n    Prod: ${val}\n    Dist: ${distPropsMap.get(name)}`);
    propMismatches++;
  }
}
for (const name of distPropsMap.keys()) {
  if (!prodPropsMap.has(name)) {
    outLines.push(`[+] Extra Property in Workspace: ${name} (Workspace value: ${distPropsMap.get(name)})`);
    propMismatches++;
  }
}
if (propMismatches === 0) {
  outLines.push("All custom properties (theme variables) match perfectly!");
} else {
  outLines.push(`Total property mismatches: ${propMismatches}`);
}

outLines.push("\n=== SELECTOR RULES COMPARISON ===");
const prodSelectors = Object.keys(prodData.rules);
const distSelectors = Object.keys(distData.rules);

let missingSelectors = 0;
let bodyMismatches = 0;

prodSelectors.forEach(sel => {
  if (!prodData.rules[sel]) return;
  if (!distData.rules[sel]) {
    outLines.push(`[-] Missing Selector in Workspace: ${sel}`);
    missingSelectors++;
  } else {
    const prodBody = prodData.rules[sel].replace(/\s+/g, "");
    const distBody = distData.rules[sel].replace(/\s+/g, "");
    if (prodBody !== distBody) {
      outLines.push(`[!] Body Mismatch for Selector: ${sel}\n    Prod: ${prodData.rules[sel]}\n    Dist: ${distData.rules[sel]}`);
      bodyMismatches++;
    }
  }
});

let extraSelectors = 0;
distSelectors.forEach(sel => {
  if (!prodData.rules[sel]) {
    outLines.push(`[+] Extra Selector in Workspace: ${sel}`);
    extraSelectors++;
  }
});

outLines.push(`\nComparison Summary:\n  Missing Selectors: ${missingSelectors}\n  Extra Selectors: ${extraSelectors}\n  Body Mismatches: ${bodyMismatches}\n`);

const outPath = "C:\\Users\\Jwavp\\.gemini\\antigravity\\worktrees\\nine-dashboard\\reconstruct-vite-project-bundle\\scratch\\css_comparison_results.txt";
fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
console.log("Comparison results written to scratch/css_comparison_results.txt");
