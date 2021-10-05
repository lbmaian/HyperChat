const { spawn } = require('child_process');

// eslint-disable-next-line no-unused-vars
const shouldBeInRoot = process.argv.indexOf('firefox') != -1;

const cmds = [
  'mkdir -p dist',
  'cd build',
  'zip -9r ../dist/HyperChat-Firefox.zip .',
  'cp ../dist/HyperChat-Firefox.zip ../dist/HyperChat-Chrome.zip',
  'zip -d ../dist/HyperChat-Chrome.zip manifest.json',
  'printf "@ manifest.chrome.json\\n@=manifest.json\\n" | zipnote -w ../dist/HyperChat-Chrome.zip',
  'zip -d ../dist/HyperChat-Firefox.zip manifest.chrome.json'
];

spawn(
  'sh',
  [
    '-c',
    cmds.join(' && ')
  ]
);
