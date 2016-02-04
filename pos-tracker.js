var createWordnok = require('wordnok').createWordnok;
var _ = require('lodash');
var callNextTick = require('call-next-tick');

function POSTracker(opts) {
  var wordnikAPIKey;

  if (opts) {
    wordnikAPIKey = opts.wordnikAPIKey;
  }

  var wordnok = createWordnok({
    apiKey: wordnikAPIKey
  });

  // var posForWords = {};
  var observedPOS = {};

  function notePOS(word, done) {
    if (word.toLowerCase() == 'a') {
      // For some reason, Wordnik calls 'a' a noun.
      markObserved('indefinite-article');
      callNextTick(done, null, ['indefinite-article']);
      return;
    }

    wordnok.getPartsOfSpeech(word.toLowerCase(), saveWordPOS);
  
    function saveWordPOS(error, partsOfSpeech) {
      if (error) {
        done(error);
        return;
      }
      // posForWords[word] = partsOfSpeech;
      // console.log(word, 'pos', partsOfSpeech);
      partsOfSpeech = _.uniq(partsOfSpeech);

      // We only want records for words that are strictly one part of speech.
      // console.log(partsOfSpeech);
      // var exclusivePOS = getExclusivePOSFromDict(partsOfSpeech);
      // if (exclusivePOS) {
      partsOfSpeech.forEach(markObserved);
      done(null, partsOfSpeech);
    }
  }

  function markObserved(partOfSpeech) {
    observedPOS[partOfSpeech] = true;
  }

  return {
    notePOS: notePOS
  };
}

module.exports = POSTracker;
