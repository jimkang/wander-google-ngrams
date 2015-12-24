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
    needToProceed: ['verb', 'verb-intransitive', 'auxiliary-verb'],
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
    needToProceed: ['verb', 'verb-intransitive', 'auxiliary-verb'],
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
  var pushCount = 0;
  var prevWordPartsOfSpeech;

  function noteWordWasPushed(word, done) {
    pushCount += 1;
    posTracker.notePOS(word, updateState);

    function updateState(error, partsOfSpeech) {
      if (error) {
        done(error);
      }
      else {
        var stage = stages[stageIndex];
        console.log('partsOfSpeech', partsOfSpeech, 'for', word);
        if (shouldSkipWord(partsOfSpeech)) {
          console.log('Skipping.');
          done();
          return;
        }

        console.log('stage.needToProceed', stage.needToProceed);
        console.log(
          '_.intersection', _.intersection(stage.needToProceed, partsOfSpeech)
        );
        if (_.intersection(stage.needToProceed, partsOfSpeech).length > 0) {
          stageIndex += 1;
          console.log('New stage:', stages[stageIndex].name);
        }

        prevWordPartsOfSpeech = partsOfSpeech;
        done();
      }
    }
  }

  function shouldSkipWord(partsOfSpeech) {
    var shouldSkip = false;
    if (containsPrepositionOrConjunction(partsOfSpeech) &&
      containsPrepositionOrConjunction(prevWordPartsOfSpeech)) {

      shouldSkip = true;
    }
    else if (containsArticle(partsOfSpeech) &&
      containsArticle(prevWordPartsOfSpeech)) {

      shouldSkip = true;
    }

    return shouldSkip;
  }

  function containsPrepositionOrConjunction(partsOfSpeech) {
    return partsOfSpeech.indexOf('preposition') !== -1 ||
      partsOfSpeech.indexOf('conjunction') !== -1;
  }

  function containsArticle(partsOfSpeech) {
    return partsOfSpeech.indexOf('definite-article') !== -1 ||
      partsOfSpeech.indexOf('indefinite-article') !== -1;
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

  function getDesiredPartsOfSpeech() {
    return stages[stageIndex].needToProceed;
  }

  function reset() {
    stageIndex = 0;
  }

  return {
    noteWordWasPushed: noteWordWasPushed,
    getNextWordSpecifier: getNextWordSpecifier,
    getDesiredPartsOfSpeech: getDesiredPartsOfSpeech,
    reset: reset
  };
}

function containsPOS(partsOfSpeech, pos) {
  return partsOfSpeech.indexOf(pos) !== -1;
}

module.exports = SentenceGuide;
