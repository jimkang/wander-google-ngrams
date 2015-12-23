var POSTracker = require('./pos-tracker');
var _ = require('lodash');

var forwardStages = [
  {
    name: 'start',
    needToProceed: ['noun', 'pronoun'],
    lookFor: '*_NOUN'
  },
  {
    name: 'pushedSubject',
    needToProceed: ['verb'],
    lookFor: '*_VERB'
  },
  {
    name: 'pushedVerb',
    needToProceed: ['noun', 'pronoun', 'adjective'],
    lookFor: '*_NOUN'
  },
  {
    name: 'done' // 'pushedObject'
  }
];

var backwardStages = [
  {
    name: 'start',
    needToProceed: ['noun', 'pronoun', 'adjective'],
    lookFor: '*_NOUN'
  },
  {
    name: 'pushedObject',
    needToProceed: ['verb'],
    lookFor: '*_VERB'
  },
  {
    name: 'pushedVerb',
    needToProceed: ['noun', 'pronoun'],
    lookFor: '*_NOUN'
  },
  {
    name: 'done' // 'pushedSubject'
  }
];

function SentenceGuide(opts) {
  var posTracker = POSTracker({
    wordnikAPIKey: opts.wordnikAPIKey
  });
  var direction;

  if (opts) {
    // posTracker = opts.posTracker;
    direction = opts.direction;
  }

  var stages = forwardStages;
  if (direction === 'backward') {
    stages = backwardStages;
  }

  var stageIndex = 0;

  var firstSpecifier = true;

  var pushedSubject = false;
  var pushedVerb = false;
  var pushedObject = false;
  var pushCount = 0;

  function noteWordWasPushed(word, done) {
    pushCount += 1;
    posTracker.notePOS(word, updateState);

    function updateState(error, partsOfSpeech) {
      if (error) {
        done(error);
      }
      else {
        var stage = stages[stageIndex];
        if (_.intersection(stage.needToProceed, partsOfSpeech).length > 0) {
          stageIndex += 1;
          console.log('New stage:', stages[stageIndex].name);
        }
        done();
      }
    }
  }

  function getNextWordSpecifier() {
    if (firstSpecifier) {
      // Keep it loose.
      firstSpecifier = false;
      return '*';
    }

    if (stages[stageIndex].name === 'done') {
      return 'END';
    }
    return stages[stageIndex].lookFor;
  }

  function reset() {
    stageIndex = 0;
  }

  return {
    noteWordWasPushed: noteWordWasPushed,
    getNextWordSpecifier: getNextWordSpecifier,
    reset: reset
  };
}

function containsPOS(partsOfSpeech, pos) {
  return partsOfSpeech.indexOf(pos) !== -1;
}

module.exports = SentenceGuide;
