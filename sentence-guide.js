var POSTracker = require('./pos-tracker');

function SentenceGuide(opts) {
  var posTracker = POSTracker();

  if (opts) {
    // posTracker = opts.posTracker;
  }

  var firstSpecifier = true;

  var whenToLookForASubject = 1;
  var whenToLookForAVerb = 4;
  var whenToLookForAnObject = 6;

  var pushedSubject = false;
  var pushedVerb = false;
  var pushedObject = false;
  var pushCount = 0;

  function noteWordWasPushed(word, done) {
    pushCount += 1;
    posTracker.notePOS(word, updateState);

    function updateState(error, posDict) {
      if (error) {
        done(error);
      }
      else {
        var exclusivePOS = posTracker.getExclusivePOSFromDict(posDict);

        if (pushedVerb &&
          (posTracker.dictContainsPOS(posDict, 'nouns') ||
          posTracker.dictContainsPOS(posDict, 'adjectives'))) {

          pushedObject = true;
          console.log('pushedObject');
        }
        else if (exclusivePOS === 'verbs') {
          pushedVerb = true;
          console.log('pushedVerb');
        }
        else if (pushedVerb && posTracker.dictContainsPOS(posDict, 'nouns')) {
          pushedSubject = true;
          console.log('pushedSubject');
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

    if (pushedObject) {
      return '*';
    }
    if (pushedVerb) {
      // Look for object.
      return '*_NOUN';
    }
    if (pushedSubject) {
      // Look for verb.
      return '*_VERB';
    }
    // Look for subject.
    return '*_NOUN';
  }

  return {
    noteWordWasPushed: noteWordWasPushed,
    getNextWordSpecifier: getNextWordSpecifier
  };
}

module.exports = SentenceGuide;
