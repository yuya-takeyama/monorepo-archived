const fs = require('fs');
const YAML = require('yaml');

const file = fs.readFileSync('./config.yaml', 'utf8');
config = YAML.parse(file);

console.log(JSON.stringify(config, null, 2));
