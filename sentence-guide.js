var POSTracker = require('./pos-tracker');
var curry = require('lodash.curry');
var intersection = require('lodash.intersection');

var nounFamily = ['noun', 'pronoun', 'noun-plural'];
var verbFamily = ['verb', 'verb-intransitive', 'auxiliary-verb'];
var objectPOS = nounFamily.concat(['adjective']);
var commonBadExits = require('./common-bad-exits');

var forwardStages = [
  {
    name: 'start',
    needToProceed: nounFamily,
    lookFor: '*_NOUN'
  },
  {
    name: 'pushedSubject',
    needToProceed: verbFamily,
    lookFor: '*_VERB'
  },
  {
    name: 'pushedVerb',
    needToProceed: objectPOS,
    lookFor: '*_NOUN',
    posShouldBeUnambiguous: true
  },
  {
    name: 'done' // 'pushedObject'
  }
];

var backwardStages = [
  {
    name: 'start',
    needToProceed: objectPOS,
    lookFor: '*_NOUN',
    posShouldBeUnambiguous: true
  },
  {
    name: 'pushedObject',
    needToProceed: verbFamily,
    lookFor: '*_VERB'
  },
  {
    name: 'pushedVerb',
    needToProceed: nounFamily,
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
  if (opts && opts.forwardStages) {
    stages = opts.forwardStages;
  }

  if (direction === 'backward') {
    stages = backwardStages;
    if (opts && opts.backwardStages) {
      stages = opts.backwardStages;
    }
  }

  var stageIndex = 0;
  var firstSpecifier = true;
  var pushCount = 0;
  var prevWordPartsOfSpeech;

  function noteWordWasPushed(word, done) {
    pushCount += 1;
    var stage = stages[stageIndex];

    posTracker.notePOS(word, updateState);

    function updateState(error, partsOfSpeech) {
      if (error) {
        done(error);
      } else {
        // console.log('partsOfSpeech', partsOfSpeech, 'for', word);

        if (pushCount > 1 && shouldSkipWord(partsOfSpeech)) {
          // console.log('Skipping.');
          done();
          return;
        }

        // console.log('stage.needToProceed', stage.needToProceed);

        if (
          stage.posShouldBeUnambiguous &&
          !partsOfSpeech.every(curry(posIsInNeededPOS)(stage))
        ) {
          // console.log(
          //   'Skipping: ' + word + ' has parts of speech that are not in ',
          //   stage.needToProceed
          // );
          done();
          return;
        }

        if (
          (!stage.disallowedExits ||
            stage.disallowedExits.indexOf(word) === -1) &&
          (!stage.disallowCommonBadExits || commonBadExits.indexOf(word) === -1)
        ) {
          var commonPOS = intersection(stage.needToProceed, partsOfSpeech);
          // console.log('_.intersection', commonPOS);

          if (commonPOS.length > 0) {
            stageIndex += 1;
            // console.log('New stage:', stages[stageIndex].name);
          }
        }

        prevWordPartsOfSpeech = partsOfSpeech;
        done();
      }
    }

    function posIsInNeededPOS(stage, pos) {
      return stage.needToProceed.indexOf(pos) !== -1;
    }
  }

  function shouldSkipWord(partsOfSpeech) {
    var shouldSkip = false;

    if (prevWordPartsOfSpeech) {
      if (
        containsPrepositionOrConjunction(partsOfSpeech) &&
        containsPrepositionOrConjunction(prevWordPartsOfSpeech)
      ) {
        shouldSkip = true;
      } else if (
        containsArticle(partsOfSpeech) &&
        containsArticle(prevWordPartsOfSpeech)
      ) {
        shouldSkip = true;
      }
    }

    return shouldSkip;
  }

  function containsPrepositionOrConjunction(partsOfSpeech) {
    return (
      partsOfSpeech.indexOf('preposition') !== -1 ||
      partsOfSpeech.indexOf('conjunction') !== -1
    );
  }

  function containsArticle(partsOfSpeech) {
    return (
      partsOfSpeech.indexOf('definite-article') !== -1 ||
      partsOfSpeech.indexOf('indefinite-article') !== -1
    );
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

module.exports = SentenceGuide;
