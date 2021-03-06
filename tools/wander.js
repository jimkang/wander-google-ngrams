var WanderGoogleNgrams = require('../index');
var config = require('../config');

if (process.argv.length < 3) {
  console.log('Usage: node tools/wander.js <word> <forward|backward>');
  process.exit();
}

var word = process.argv[2];
var direction = 'forward';

if (process.argv.length > 3) {
  direction = process.argv[3];
}

var createWanderStream = WanderGoogleNgrams({
  wordnikAPIKey: config.wordnikAPIKey
});

var opts = {
  word: word,
  direction: direction,
  repeatLimit: 1,
  tryReducingNgramSizeAtDeadEnds: true,
  shootForASentence: true,
  maxWordCount: 20,
  forwardStages: [
    {
      name: 'pushedVerb',
      needToProceed: ['noun', 'pronoun', 'noun-plural', 'adjective'],
      lookFor: '*_NOUN',
      // posShouldBeUnambiguous: true
    },
    {
      name: 'done'
    }
  ]
};
var stream = createWanderStream(opts);

stream.on('end', reportDone);
stream.on('error', reportError);
// stream.pipe(process.stdout);
stream.on('data', reportWord);

function reportDone() {
  console.log('Done!');
}

function reportError(error) {
  console.log(error);
}

function reportWord(word) {
  console.log('WORD:', word);
}