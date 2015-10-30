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

var wander = WanderGoogleNgrams();
var opts = {
  word: word,
  direction: direction
};
wander(opts, done);

function done(error, path) {
  if (error) {
    console.log(error);
  }
  else {
    console.log(path);
  }
}
