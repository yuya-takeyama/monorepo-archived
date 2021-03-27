const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const file = fs.readFileSync(path.join(__dirname, 'config.yaml'), 'utf8');
config = YAML.parse(file);

console.log(JSON.stringify(config, null, 2));
