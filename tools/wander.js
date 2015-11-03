var WanderGoogleNgrams = require('../index');

if (process.argv.length < 3) {
  console.log('Usage: node tools/wander.js <word> <forward|backward>');
  process.exit();
}

var word = process.argv[2];
var direction = 'forward';

if (process.argv.length > 3) {
  direction = process.argv[3];
}

var createWanderStream = WanderGoogleNgrams();
var opts = {
  word: word,
  direction: direction
};
var stream = createWanderStream(opts);

stream.on('end', reportDone);
stream.on('error', reportError);
stream.pipe(process.stdout);

function reportDone() {
  console.log('Done!');
}

function reportError(error) {
  console.log(error);
}
